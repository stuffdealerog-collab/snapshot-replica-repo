import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useLang } from "@/lib/LangContext";
import { basePrices, destinationFlags } from "@/lib/api";

const cardVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const DestinationCards = () => {
  const { t } = useLang();

  const countries = ["USA", "Canada", "UK", "Australia"];

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
          {t("dest.heading")}
        </motion.h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {countries.map((country, i) => (
            <motion.div
              key={country}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariants}
              className="glass group rounded-2xl p-6 transition-all duration-300 hover:bg-glass-hover hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 text-4xl">{destinationFlags[country]}</div>
              <h3 className="mb-3 text-xl font-bold text-foreground">{country}</h3>
              <div className="mb-1 text-sm text-muted-foreground">
                {t("dest.tourism")} <span className="font-semibold text-foreground">${basePrices[country].Tourism}</span>
              </div>
              <div className="mb-5 text-sm text-muted-foreground">
                {t("dest.work")} <span className="font-semibold text-foreground">${basePrices[country].Work}</span>
              </div>
              <Link
                to={`/intake?country=${country}`}
                className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                {t("dest.cta")}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DestinationCards;
