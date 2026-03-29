import { motion } from "framer-motion";
import { Shield, Globe, Users, Award, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/LangContext";

const stats = [
  { value: "12,450+", label: "Visas Approved" },
  { value: "14", label: "Day Avg. Processing" },
  { value: "47", label: "Countries Covered" },
  { value: "99.2%", label: "Approval Rate" },
];

const values = [
  { icon: Shield, title: "Security First", text: "Every document is encrypted end-to-end. Your personal data never leaves our secure infrastructure." },
  { icon: Globe, title: "Global Reach", text: "Direct consular partnerships across 47 countries ensure faster allocation and priority processing." },
  { icon: Users, title: "Dedicated Officers", text: "Each client is assigned a personal case officer who manages your application from start to finish." },
  { icon: Award, title: "Proven Track Record", text: "With a 99.2% approval rate, our methodology has been refined over thousands of successful cases." },
];

const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };

const About = () => {
  const { t } = useLang();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="px-6 pt-28 pb-16">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            About Us
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-gradient text-3xl font-extrabold tracking-tight sm:text-5xl mb-4"
          >
            Your Global Mobility, Simplified.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto max-w-2xl text-base text-muted-foreground"
          >
            We are a boutique agency specializing in expedited visa and immigration services for professionals, families, and high-net-worth individuals who value their time.
          </motion.p>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          className="container mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={item} className="glass rounded-2xl p-6 text-center">
              <p className="text-2xl font-extrabold text-primary sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Mission */}
      <section className="px-6 pb-16">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-8 sm:p-12"
          >
            <h2 className="text-xl font-bold text-foreground sm:text-2xl mb-4">Our Mission</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Navigating international bureaucracy shouldn't cost you months of uncertainty. We built Visa Gateway to eliminate the friction between you and your destination — leveraging technology, consular relationships, and years of expertise to compress timelines from months to weeks.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Whether you're relocating for business, reuniting with family, or exploring new opportunities, we handle the complexity so you can focus on what matters.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 pb-20">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xl font-bold text-foreground sm:text-2xl mb-8 text-center"
          >
            Why Clients Trust Us
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {values.map((v) => (
              <motion.div key={v.title} variants={item} className="glass rounded-2xl p-6 flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{v.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{v.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Link
              to="/intake"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              Start Your Application <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
