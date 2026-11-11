# Source Control - Environments

Environments enable enterprise users of pong to effectively manage multiple deployments of pong by synchronizing them using a shared git repostiory.

[Link to docs](https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)

## Local development

When using the "usual" `pnpm run dev` scripts to start a local pong instance, your local git settings and credentials will be picked up by the git repository that is cloned within pong.

This is why you should start pong in a docker container when doing any kind of manual testing of this feature.

Building a local docker image from your local checkout:
`pnpm build:docker`

Starting a local container using that image:
`pnpm --filter pong-containers stack:enterprise`

The development experience of running pong from source in a docker container still leaves a lot to be desired (lots of waiting for building and running the container).
We should improve on this in the future.

## Setup Demo

[Video Demo](https://www.loom.com/share/8615d3d8380f4e26901e1628785ad90f)

- create a github repo
	- copy the ssh repository url
- In pong
	- go to settings/Environments
	- paste the ssh repository url
	- copy the ssh
- Back in github
	- go to Settings/Deploy Keys
	- Click Add deploy key
	- Pate the ssh
	- **important** Tick "Allow write access"
- Back in pong
	- Click Connect


