# x-thread-writer — Claude Code Skill

A Claude Code skill that turns technical projects into viral X (Twitter) threads that
actually sound human.

Most AI-written threads get scrolled past. This skill encodes the specific patterns that
make a thread feel genuine: lowercase tone, no em dashes, story-first structure, specific
numbers, honest CTAs. Built from iterating on real posts until they stopped sounding generated.

## What it does

- Extracts the human story from your technical project
- Structures a 4-tweet thread: hook → reveal → link/payoff → personal reply
- Writes in a voice that doesn't trigger "this was written by AI" instincts
- Saves output as a plain text file ready to copy tweet by tweet
- Includes posting instructions and timing tips

## Install

```bash
git clone https://github.com/yamz8/x-thread-skill.git
cp -r x-thread-skill ~/.claude/skills/x-thread-writer
```

## Usage

Just describe your project and tell Claude you want to post about it on X:

> "I built a tool that does X, want to write a thread about it for X/Twitter"
> "help me announce my open source repo on X"
> "turn what I just built into a viral tweet thread"

## The rules it follows

- No em dashes (the biggest AI tell on X right now)
- Lowercase conversational tone
- Opens with a person/situation, not a product
- Specific numbers and details over vague descriptions
- Honest about limitations (builds trust, gets more engagement)
- Short imperfect sentences over polished prose

## License

MIT
