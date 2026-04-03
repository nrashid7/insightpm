import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  label: string;
}

const AnimatedCounter = ({ value, label }: AnimatedCounterProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    const numericMatch = value.match(/^([\d.]+)/);
    if (!numericMatch) {
      setDisplay(value);
      return;
    }

    const target = parseFloat(numericMatch[1]);
    const suffix = value.replace(numericMatch[1], "");
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);

      if (target >= 1000) {
        setDisplay(`${(current / 1000).toFixed(current >= target ? 0 : 0)}${current >= target ? "" : ""}`.replace(/\.0$/, ""));
        if (current >= target) {
          setDisplay(`${target >= 1000 ? target / 1000 + "K" : target}`.replace("K", "").replace(/\.0$/, ""));
          setDisplay(value);
          return;
        }
        setDisplay(`${Math.floor(current / 1000)}K${suffix}`);
      } else {
        setDisplay(`${current}${suffix}`);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <motion.div
        className="text-2xl md:text-3xl font-bold text-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        {display}
      </motion.div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

export default AnimatedCounter;
