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
- All platform environments (EC, Veicular, Imobiliária) are served by the single published app; `src/lib/environment.ts` points every environment to the hub URL unless a VITE_*_URL override is set. Why: per-environment *.lovable.app subdomains do not exist and return "No Lovable project found".
