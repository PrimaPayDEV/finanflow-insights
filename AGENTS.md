<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Each environment (EC, Veicular, Imobiliária) can run on its own subdomain of the brand domain so each keeps a separate browser login; `src/lib/environment.ts` detects the environment from the first hostname label and only links to own subdomains when `OWN_DOMAINS_ACTIVE` is true or the app is already on the brand domain. Why: sessions are stored per origin, and unconnected subdomains return "No Lovable project found".
- Each browser tab is pinned to one environment by the sub-links /ec, /veicular, /imobiliaria (also /login?env=); `src/lib/tab-session.ts`, installed by an explicit call at the top of `src/router.tsx` (never a bare side-effect import — package.json has `"sideEffects": false`, so the published build drops it), stores the auth session and auth BroadcastChannel under a per-environment key. Why: the generated auth client uses one localStorage key per origin, and the user needs different environments signed in at once on the same address. Environment switch links must be full-page links so the tab reloads into the new scope.
