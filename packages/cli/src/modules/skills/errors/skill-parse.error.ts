import { UserError } from '@pong/errors';

/** A skill folder that pong cannot read as a skill, for example a SKILL.md without frontmatter. */
export class SkillParseError extends UserError {}
