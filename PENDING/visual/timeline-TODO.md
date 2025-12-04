# timeline todo

- fix the filters to persist so it doesnt reset each time view is changed

---

## file changes

### will add this

- detect file changes and collect a count
- use apply_patch and other file changing tools to classify as a file change
- create a parser for apply_patch calls that transform the files normalized w/o the shell syntax etc...

### notes

[will be used in timeline props to send to file changed, which will be parsed apply_patch etc...](https://ui.aceternity.com/components/3d-pin)

---

## timeline props expand (use the pop-out motion/animation on initial click)

- clicking on timeline prop will trigger [this effect](https://ui.aceternity.com/components/expandable-card) allowing full size view of prop

---

## apply_patch transformation (optional) animation (when the pop-out effect from [this effect](https://ui.aceternity.com/components/expandable-card) is fully expanded [then this animation triggers](https://animate-ui.com/docs/components/animate/code))

- able to turn of in settings menu
- if on, then when a timeline prop that is clicked on by user opens then this animation will trigger
- [animation](https://animate-ui.com/docs/components/animate/code)
- parses the event prop and reconstruct the underlying source file exactly as it should exist on disk, without any surrounding shell or patch syntax.

---
