import { motion } from "framer-motion";

const Splash = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <motion.div
        className="flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Freelaki
        </h1>
        <motion.span
          className="text-base font-medium tracking-[0.3em] uppercase text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Profissionais
        </motion.span>
      </motion.div>
    </div>
  );
};

export default Splash;
