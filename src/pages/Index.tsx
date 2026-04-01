import { motion } from "framer-motion";
import freelakiLogo from "@/assets/freelaki-logo.png";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background font-heading">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.img
          src={freelakiLogo}
          alt="Freelaki Logo"
          width={160}
          height={160}
          className="drop-shadow-lg"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        <div className="flex flex-col items-center gap-1">
          <motion.h1
            className="text-5xl font-bold tracking-tight text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Freelaki
          </motion.h1>
          <motion.span
            className="text-lg font-medium tracking-widest uppercase text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Profissionais
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
