# Platform rules for multi-post sequences

Per-platform rules for the `social-thread` skill: how a sequence is budgeted for
each platform. Load the target platform's row before drafting, and check every post
against it before returning — don't budget from memory.

## Constraint table

| Platform            | Per-post limit                          | Hook budget              | Sequence length | Links                       | Hashtags                     |
| ------------------- | --------------------------------------- | ------------------------ | --------------- | --------------------------- | ---------------------------- |
| X thread            | 280 chars/post                          | ≤240 (quote-tweet room)  | 5–12 posts      | Final post only             | None mid-thread; ≤1 in final |
| LinkedIn multi-post | ~1,300 chars/post preferred, 3,000 hard | ~200 (survives the fold) | 4–8 posts       | Final post or first comment | 0–3, final post only         |

## Notes

- **X** counts URLs as 23 chars and most emoji as 2. The culture punishes overpromise hardest — a hook that writes a check the thread can't cash gets ratioed.
- **LinkedIn** multi-posts read slower and tolerate more per post, but the fold on the FIRST post is still make-or-break. Continuity matters more than raw count.
