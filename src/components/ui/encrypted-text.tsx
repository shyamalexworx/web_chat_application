import React, { useState, useEffect, useRef, useCallback } from 'react';

const CHARS = 'ABCDEF0123456789!@#$%^&*()_+-=~{}[]|;:,.<>?';

export interface EncryptedTextProps {
  text: string;
  className?: string;
  scrambleSpeed?: number;
  revealSpeed?: number;
  highlightClass?: string;
}

export const EncryptedText: React.FC<EncryptedTextProps> = ({
  text,
  className = '',
  scrambleSpeed = 40,
  revealSpeed = 65,
  highlightClass = 'text-[#4F8CFF]',
}) => {
  const [displayText, setDisplayText] = useState(text);
  const isScramblingRef = useRef(false);

  const triggerAnimation = useCallback(() => {
    if (isScramblingRef.current) return;
    isScramblingRef.current = true;

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((letter, index) => {
            if (letter === ' ') return ' ';
            if (index < iteration) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        clearInterval(interval);
        setDisplayText(text);
        isScramblingRef.current = false;
      }

      iteration += 1 / 2.5;
    }, scrambleSpeed);
  }, [text, scrambleSpeed]);

  useEffect(() => {
    triggerAnimation();
  }, [triggerAnimation]);

  return (
    <span
      onMouseEnter={triggerAnimation}
      className={`font-mono tracking-wider cursor-pointer inline-block transition-colors ${className}`}
      title="Decrypted Brand Identifier"
    >
      {displayText}
    </span>
  );
};

export default EncryptedText;

