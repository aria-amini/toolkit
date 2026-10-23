---
'@aamini/config': patch
---

Load the varlock plugin lazily. `vp check`, `vp fmt`, `vp lint`, staged hooks, and the `vp run` task lookup read the config without loading varlock, so it no longer resolves the env for them.
