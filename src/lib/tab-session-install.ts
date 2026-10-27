// Separa o login por ambiente em cada aba antes que qualquer módulo use o
// cliente de login. O package.json declara "sideEffects": false, então um
// import só de efeito colateral é descartado no build publicado — por isso a
// instalação é exportada e chamada explicitamente em src/router.tsx.
import { installTabSessionScope } from "./tab-session";

export function ensureTabSessionScope() {
  installTabSessionScope();
}
