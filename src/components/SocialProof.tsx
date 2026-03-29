import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Star } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const reviews = [
  { name: "Oleksii K.", text: "Got my Canada work visa in 11 days. Unbelievable." },
  { name: "Sarah M.", text: "The AI consultation was so quick and easy. Fully guided." },
  { name: "Dmitro V.", text: "US tourist visa approved. The team handled everything." },
  { name: "Amina R.", text: "They coached me for the interview. I felt 100% ready." },
  { name: "James L.", text: "Canada PR processed in record time." },
  { name: "Olena P.", text: "They handled everything, I just showed up." },
  { name: "David R.", text: "Australia work visa done in 2 weeks flat." },
  { name: "Sophie M.", text: "Best immigration service I've ever used." },
];

function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const count = useMotionValue(0);
  const display = useTransform(count, (v) => `${prefix}${Math.floor(v).toLocaleString()}${suffix}`);

  useEffect(() => {
    const controls = animate(count, target, { duration: 2.5, ease: "easeOut" });
    return controls.stop;
  }, [count, target]);

  return <motion.span>{display}</motion.span>;
}

const ReviewCard = ({ name, text }: { name: string; text: string }) => (
  <div className="glass flex-shrink-0 rounded-xl p-5 w-[280px]">
    <div className="mb-2 flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
      ))}
    </div>
    <p className="mb-3 text-sm leading-relaxed text-muted-foreground">"{text}"</p>
    <p className="text-sm font-semibold text-foreground">{name}</p>
  </div>
);

const SocialProof = () => {
  const { t } = useLang();

  return (
    <section className="relative overflow-hidden px-6 py-20">
      <div className="container mx-auto">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-14 flex flex-wrap items-center justify-center gap-8 sm:gap-16"
        >
          <div className="text-center">
            <div className="text-3xl font-extrabold text-foreground sm:text-4xl"><AnimatedCounter target={12450} suffix="+" /></div>
            <p className="mt-1 text-sm text-muted-foreground">{t("social.approved")}</p>
          </div>
          <div className="hidden h-10 w-px bg-border sm:block" />
          <div className="text-center">
            <div className="text-3xl font-extrabold text-primary sm:text-4xl"><AnimatedCounter target={14} suffix=" Days" /></div>
            <p className="mt-1 text-sm text-muted-foreground">{t("social.processing")}</p>
          </div>
          <div className="hidden h-10 w-px bg-border sm:block" />
          <div className="text-center">
            <div className="text-3xl font-extrabold text-foreground sm:text-4xl">4.9<span className="text-muted-foreground">/5</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{t("social.reviews")}</p>
          </div>
        </motion.div>
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-background to-transparent" />
          <div className="flex overflow-hidden">
            <motion.div
              className="flex gap-4 flex-shrink-0"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
              {[...reviews, ...reviews].map((r, i) => (
                <ReviewCard key={i} name={r.name} text={r.text} />
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
