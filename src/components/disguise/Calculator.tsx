"use client";
// Disguise mode — looks exactly like a real calculator
// Enter panic PIN (e.g. "0000=") to trigger SOS silently
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore, useUserStore } from "@/stores";
import { useSOS } from "@/lib/hooks/useSOS";

const PANIC_PIN = "0000"; // User-configurable in settings

const BUTTONS = [
  ["AC", "+/-", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "="],
];

export function DisguiseCalculator() {
  const [display, setDisplay] = useState("0");
  const [input, setInput] = useState("");
  const [operator, setOperator] = useState<string | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  const [panicBuffer, setPanicBuffer] = useState("");
  const [sosTriggerFlash, setSosTriggerFlash] = useState(false);

  const { deactivateDisguise } = useUIStore();
  const { triggerSOS } = useSOS();

  const handleButton = (val: string) => {
    // Track panic buffer
    const newBuffer = (panicBuffer + val).slice(-5);
    setPanicBuffer(newBuffer);

    // Check panic sequence: PANIC_PIN + "="
    if (newBuffer === PANIC_PIN + "=") {
      setSosTriggerFlash(true);
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100, 50, 200]);
      setTimeout(() => {
        triggerSOS("button");
        setSosTriggerFlash(false);
      }, 300);
      return;
    }

    // Normal calculator logic
    if (val === "AC") {
      setDisplay("0"); setInput(""); setOperator(null); setPrev(null);
    } else if (val === "+/-") {
      setDisplay((d) => String(parseFloat(d) * -1));
    } else if (val === "%") {
      setDisplay((d) => String(parseFloat(d) / 100));
    } else if (["÷", "×", "−", "+"].includes(val)) {
      setPrev(display); setOperator(val); setInput(""); setDisplay("0");
    } else if (val === "=") {
      if (prev && operator) {
        const a = parseFloat(prev), b = parseFloat(display);
        const results: Record<string, number> = { "÷": a / b, "×": a * b, "−": a - b, "+": a + b };
        const result = results[operator];
        setDisplay(isNaN(result) ? "Error" : String(parseFloat(result.toFixed(10))));
        setPrev(null); setOperator(null);
      }
    } else {
      setDisplay((d) => d === "0" ? val : d + val);
    }
  };

  return (
    <motion.div
      className={`fixed inset-0 z-50 bg-black flex flex-col ${sosTriggerFlash ? "bg-shield-900" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
    >
      {/* Display */}
      <div className="flex-1 flex items-end justify-end px-6 pb-4">
        <div className="text-right">
          {operator && prev && (
            <p className="text-gray-600 text-xl mb-1">{prev} {operator}</p>
          )}
          <p className={`text-white font-light ${display.length > 9 ? "text-4xl" : "text-6xl"}`}>
            {display}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="px-3 pb-safe pb-6 space-y-3">
        {BUTTONS.map((row, ri) => (
          <div key={ri} className={`flex gap-3 ${row.length === 3 ? "" : ""}`}>
            {row.map((btn, bi) => {
              const isOperator = ["÷", "×", "−", "+", "="].includes(btn);
              const isFunction = ["AC", "+/-", "%"].includes(btn);
              const isZero = btn === "0";
              return (
                <motion.button
                  key={btn}
                  onClick={() => handleButton(btn)}
                  className={`
                    h-[78px] rounded-full text-xl font-medium flex items-center justify-center
                    transition-colors select-none
                    ${isZero ? "flex-[2] pl-7 justify-start" : "flex-1"}
                    ${isOperator ? "bg-[#FF9F0A] text-white" : ""}
                    ${isFunction ? "bg-[#A5A5A5] text-black" : ""}
                    ${!isOperator && !isFunction ? "bg-[#333333] text-white" : ""}
                  `}
                  whileTap={{ scale: 0.92, opacity: 0.7 }}
                >
                  {btn}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
