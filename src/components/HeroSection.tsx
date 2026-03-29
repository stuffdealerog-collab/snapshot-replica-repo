import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Abstract orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/3 h-[500px] w-[500px] animate-float rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] animate-float rounded-full bg-accent/5 blur-[100px]" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.h1
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-gradient text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Express Visas
          <br />
          Without the Wait.
        </motion.h1>

        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
        >
          Skip the 4-month queue. We secure your global mobility in weeks, not
          months. We handle the bureaucracy, you pack your bags.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          className="mt-10"
        >
          <Link
            to="/pricing"
            className="glow-primary glow-pulse inline-block rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground transition-all duration-300 hover:scale-105"
          >
            Start Your Application
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
