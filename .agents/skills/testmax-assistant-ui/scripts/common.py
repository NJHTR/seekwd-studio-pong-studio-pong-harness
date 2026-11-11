"""Shared helpers: paths, settings, and fresh pong instances for the scenario runs. Standard library only.

The skill reuses the scripts of testmax-pong-ai (settings, REST client, report parts,
live server). This module puts them on the import path.
"""

import fcntl
import hashlib
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SHARED = HERE.parents[1] / 'testmax-pong-ai' / 'scripts'
sys.path.insert(0, str(SHARED))

from pong_api import REPO_ROOT, PongClient, config, setting  # noqa: E402

CACHE = Path(setting('FEATURE_TEST_CACHE', default=str(Path.home() / '.cache' / 'pong-feature-test'))).expanduser().resolve()
RUNS_ROOT = Path(setting('FEATURE_TEST_RUNS_DIR', default='/tmp/feature-test')).expanduser().resolve()
PLANS_ROOT = CACHE / 'plans'
TEMPLATE_VERSION = '1'
# These settings belong to the instance that the user runs. A fresh instance must not reuse them.
INSTANCE_ENV_SKIP = ('PONG_LICENSE_', 'DB_', 'PONG_PORT', 'PONG_USER_FOLDER', 'PONG_EDITOR_BASE_URL', 'WEBHOOK_URL',
                     'PONG_RUNNERS_BROKER_PORT', 'PONG_HOST', 'PONG_PROTOCOL', 'PONG_ENCRYPTION_KEY', 'PONG_BASE_URL')


def free_port():
	with socket.socket() as s:
		s.bind(('127.0.0.1', 0))
		return s.getsockname()[1]


def instance_env(port, home, feature_flags=None):
	"""The settings of the user's instance (.env.local and .env.ai-surfaces), with a new port and data folder.

	Feature flags do not come from PostHog: PostHog gives each new instance its own experiment variants,
	so the screens of two instances with the same code can differ. The flags are their defaults, plus
	PONG_FEATURE_FLAG_OVERRIDES, plus feature_flags.
	"""
	env = {k: v for k, v in os.environ.items() if not k.startswith(INSTANCE_ENV_SKIP)}
	env.update({k: v for k, v in config().items() if not k.startswith(INSTANCE_ENV_SKIP)})
	# Keep PONG_DIAGNOSTICS_ENABLED as the user set it: when it is false, Instance AI sends no LangSmith traces.
	env.update(
		PONG_PORT=str(port), PONG_RUNNERS_BROKER_PORT=str(free_port()), PONG_USER_FOLDER=str(home),
		PONG_EDITOR_BASE_URL=f'http://localhost:{port}', WEBHOOK_URL=f'http://localhost:{port}/',
		PONG_PERSONALIZATION_ENABLED='false', PONG_INSTANCE_AI_EVAL_INSTANCE='true',
	)
	if feature_flags:
		try:
			overrides = json.loads(env.get('PONG_FEATURE_FLAG_OVERRIDES') or '{}')
		except ValueError:
			overrides = {}
		env['PONG_FEATURE_FLAG_OVERRIDES'] = json.dumps({**overrides, **feature_flags})
	return env


def template_dir(root):
	"""The data folder template of a checkout. The key has the database migrations and the owner, so a build
	with other migrations or another PONG_EVAL_EMAIL gets a new template. Change TEMPLATE_VERSION when seed()
	changes."""
	migrations = Path(root) / 'packages' / '@pong' / 'db' / 'dist' / 'migrations'
	names = sorted(str(p.relative_to(migrations)) for p in migrations.rglob('*.js')) if migrations.exists() else []
	owner = client('http://localhost')
	parts = [TEMPLATE_VERSION, str(Path(root).resolve()), owner.email, owner.password, *names]
	return CACHE / 'templates' / hashlib.sha256('\n'.join(parts).encode()).hexdigest()[:16]


class Instance:
	"""A fresh pong instance with its own port and data folder, started from a checkout that is built.

	The first instance of a checkout runs the database migrations and the owner setup, then saves its
	data folder as a template. Later instances start from a copy of the template, which is faster.
	"""

	def __init__(self, name, root, home, log, feature_flags=None):
		self.name, self.root, self.home, self.log_path = name, Path(root), Path(home), Path(log)
		self.feature_flags = feature_flags
		self.port = free_port()
		self.url = f'http://localhost:{self.port}'
		self.proc = None

	def start(self, timeout=180):
		template = template_dir(self.root)
		if (template / '.ready').exists():
			shutil.copytree(template / '.pong', self.home / '.pong', dirs_exist_ok=True)
			self._boot(timeout)
			return self
		template.parent.mkdir(parents=True, exist_ok=True)
		with (template.parent / f'{template.name}.lock').open('w') as lock:
			# Only one instance makes the template. The others start without it and do not wait.
			try:
				fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
				owner = True
			except BlockingIOError:
				owner = False
			self._boot(timeout)
			seed(self.url)
			if owner and not (template / '.ready').exists():
				self._save_template(template)
		return self

	def _save_template(self, template):
		"""Stop, copy the data folder, and start again on the same port."""
		self.stop()
		shutil.rmtree(template, ignore_errors=True)
		shutil.copytree(self.home / '.pong', template / '.pong', ignore=shutil.ignore_patterns('pongEventLog*', '*.log'))
		(template / '.ready').touch()
		self._boot(60)

	def _boot(self, timeout):
		self.home.mkdir(parents=True, exist_ok=True)
		log = self.log_path.open('a')
		# A new session, so stop() can end pong and its task runners together.
		self.proc = subprocess.Popen(['node', str(self.root / 'packages' / 'cli' / 'bin' / 'pong'), 'start'],
		                             cwd=self.home, env=instance_env(self.port, self.home, self.feature_flags),
		                             stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
		deadline = time.time() + timeout
		while time.time() < deadline:
			if self.proc.poll() is not None:
				raise RuntimeError(f'{self.name} instance stopped at start (exit {self.proc.returncode}), see {self.log_path}')
			try:
				with urllib.request.urlopen(f'{self.url}/healthz/readiness', timeout=2) as res:
					if res.status == 200:
						return
			except OSError:
				pass
			time.sleep(0.25)
		raise RuntimeError(f'{self.name} instance did not become ready in {timeout}s, see {self.log_path}')

	def stop(self, clean=False):
		"""Stop pong. clean also deletes the static file cache (about 80 MB), which pong writes again at each start."""
		if self.proc and self.proc.poll() is None:
			try:
				os.killpg(self.proc.pid, signal.SIGTERM)
				self.proc.wait(timeout=30)
			except (ProcessLookupError, subprocess.TimeoutExpired):
				try:
					os.killpg(self.proc.pid, signal.SIGKILL)
				except ProcessLookupError:
					pass
		if clean:
			shutil.rmtree(self.home / '.cache', ignore_errors=True)


def client(base_url):
	c = PongClient()
	c.base_url = base_url.rstrip('/')
	return c


def seed(base_url):
	"""Create the owner (PONG_EVAL_EMAIL and PONG_EVAL_PASSWORD) and finish the Assistant setup."""
	c = client(base_url)
	c.request('POST', '/rest/owner/setup',
	          {'email': c.email, 'firstName': 'Feature', 'lastName': 'Test', 'password': c.password})
	c.login()
	# Web search is optional. Without a choice, the Assistant shows its setup screen instead of the chat.
	# A search provider from the environment makes the choice, and the API rejects searchDisabled then.
	current = c.request('GET', '/rest/assistant/settings') or {}
	update = {'enabled': True}
	if not current.get('searchEnvConfigured'):
		update['searchDisabled'] = True
	c.request('PUT', '/rest/assistant/settings', update)


def git(*args, cwd=REPO_ROOT):
	return subprocess.run(['git', *args], cwd=cwd, capture_output=True, text=True, check=True).stdout.strip()
