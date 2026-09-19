'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Reveal({
  children,
  delay = 0,
  duration = 0.8,
  yOffset = 60,
  className = '',
  style = {},
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, filter: 'blur(10px)', scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  delay = 0,
  staggerChildren = 0.09,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  staggerChildren?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren,
          },
        },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 45, filter: 'blur(8px)', scale: 0.98 },
        visible: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          scale: 1,
          transition: {
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function InteractiveCard({
  children,
  onClick,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -4, borderColor: 'rgba(245, 158, 11, 0.35)', transition: { duration: 0.2 } }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
      onClick={onClick}
      className={className}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export function InteractiveButton({
  children,
  onClick,
  disabled = false,
  type = 'button',
  variant = 'primary',
  style = {},
}: {
  children: React.ReactNode;
  onClick?: (e: any) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'amber-ghost';
  style?: React.CSSProperties;
}) {
  const shouldReduceMotion = useReducedMotion();

  const getBaseStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#F59E0B',
          color: '#080808',
          border: 'none',
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
        };
      case 'secondary':
        return {
          backgroundColor: '#1C1C1C',
          color: '#F5F5F4',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: '#A8A29E',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        };
      case 'amber-ghost':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#F59E0B',
          border: '1px solid rgba(245, 158, 11, 0.25)',
        };
    }
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={shouldReduceMotion || disabled ? {} : { scale: 1.02, transition: { duration: 0.15 } }}
      whileTap={shouldReduceMotion || disabled ? {} : { scale: 0.98 }}
      style={{
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        opacity: disabled ? 0.6 : 1,
        ...getBaseStyle(),
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

