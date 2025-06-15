import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

export function AnimatedNumber({ value, precision = 6 }) {
  const ref = useRef(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const controls = animate(prevValue.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => {
        node.textContent = parseFloat(latest).toFixed(precision);
      },
    });
    
    prevValue.current = value;
    return () => controls.stop();
  }, [value, precision]);

  return <span ref={ref} />;
}
