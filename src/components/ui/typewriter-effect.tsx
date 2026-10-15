import React, { useEffect, useState } from 'react';

export interface TypewriterWord {
  text: string;
  className?: string;
}

export interface TypewriterEffectProps {
  words: TypewriterWord[];
  className?: string;
  cursorClassName?: string;
}

export const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
  words,
  className = '',
  cursorClassName = '',
}) => {
  // Combine all characters with their styling
  const characters: { char: string; className?: string }[] = [];
  words.forEach((word) => {
    word.text.split('').forEach((char) => {
      characters.push({ char, className: word.className });
    });
  });

  const [displayedCount, setDisplayedCount] = useState(0);

  useEffect(() => {
    if (displayedCount < characters.length) {
      const timeout = setTimeout(() => {
        setDisplayedCount((prev) => prev + 1);
      }, 90);
      return () => clearTimeout(timeout);
    }
  }, [displayedCount, characters.length]);

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className="inline-block">
        {characters.slice(0, displayedCount).map((item, idx) => (
          <span key={idx} className={item.className || ''}>
            {item.char}
          </span>
        ))}
      </div>
      <span
        className={`inline-block w-[3px] h-[1.1em] ml-1 bg-[#4F8CFF] animate-pulse rounded-full align-middle ${cursorClassName}`}
      />
    </div>
  );
};

export const TypewriterEffectSmooth: React.FC<TypewriterEffectProps> = ({
  words,
  className = '',
  cursorClassName = '',
}) => {
  return (
    <TypewriterEffect
      words={words}
      className={className}
      cursorClassName={cursorClassName}
    />
  );
};

