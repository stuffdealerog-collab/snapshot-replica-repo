import { motion } from "framer-motion";
import { Zap, Bot, Target, CheckCircle } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const cardVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const BentoGrid = () => {
  const { t } = useLang();

  const cards = [
    { icon: Zap, title: t("bento.speed.title"), text: t("bento.speed.text"), className: "md:col-span-2 md:row-span-1" },
    { icon: Bot, title: t("bento.ai.title"), text: t("bento.ai.text"), className: "md:col-span-1 md:row-span-2" },
    { icon: Target, title: t("bento.coach.title"), text: t("bento.coach.text"), className: "md:col-span-1 md:row-span-1" },
    { icon: CheckCircle, title: t("bento.hassle.title"), text: t("bento.hassle.text"), className: "md:col-span-1 md:row-span-1" },
  ];

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
          {t("bento.heading")}
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
