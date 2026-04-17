// Compat shim: o BottomNav antigo agora reexporta o FloatingNav.
// Mantemos esse arquivo para que páginas que importam BottomNav continuem funcionando.
import { FloatingNav } from "@/components/FloatingNav";

const BottomNav = () => <FloatingNav />;

export default BottomNav;
