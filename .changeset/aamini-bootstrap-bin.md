---
'@aamini/config': patch
---

Add the `aamini` bin. `aamini bootstrap` configures a checkout (workspace ports and env, orphaned Docker cleanup, env validation, Docker services, migrations, dev daemon) and verifies that the app answers. The TanStack template ran this code from its own `mise-tasks/`. Apps now get fixes through a version bump.
