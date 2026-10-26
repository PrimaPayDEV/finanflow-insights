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
