import { motion } from "framer-motion";
import { Zap, ShieldCheck, UserCheck, RefreshCw } from "lucide-react";

const cards = [
  {
    icon: Zap,
    title: "Unmatched Speed",
    text: "Instead of the usual 3-4 months, we process your express visa in approximately 2 weeks.",
    className: "md:col-span-2 md:row-span-1",
  },
  {
    icon: ShieldCheck,
    title: "Comprehensive Support",
    text: "Any questions, problems, or complex issues? We absorb the stress and handle them all for you.",
    className: "md:col-span-1 md:row-span-2",
  },
  {
    icon: UserCheck,
    title: "Your Only Task",
    text: "Simply attend the interview. We will strictly coach you on exactly what to do, what to say, and how to present yourself flawlessly.",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    icon: RefreshCw,
    title: "Seamless Process",
    text: "After the interview, hand over your documents. Simply wait ~2 weeks while our experts secure your stamp.",
    className: "md:col-span-1 md:row-span-1",
  },
];

const cardVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.15, ease: "easeOut" },
  }),
};

const BentoGrid = () => {
  return (
    <section className="relative px-6 py-24">
      <div className="container mx-auto">
        <motion.h2
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Why Choose Us
        </motion.h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariants}
              className={`glass group cursor-default rounded-2xl p-8 transition-all duration-300 hover:bg-glass-hover hover:shadow-lg hover:shadow-primary/5 ${card.className}`}
            >
              <card.icon className="mb-5 h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
              <h3 className="mb-3 text-xl font-bold text-foreground">{card.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{card.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
