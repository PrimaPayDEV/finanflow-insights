// Importado primeiro no router: separa o login por ambiente em cada aba
// antes que qualquer outro módulo use o cliente de login.
import { installTabSessionScope } from "./tab-session";

installTabSessionScope();
