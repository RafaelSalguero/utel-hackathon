'use client';

import { Loader2, Upload } from 'lucide-react';
import { useId, useState } from 'react';
import styles from './FileDrop.module.css';

export function FileDrop({ onFile, disabled }: { readonly onFile: (file: File) => void; readonly disabled: boolean }) {
  const id = useId();
  const [arrastrando, setArrastrando] = useState(false);

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again after an error
    if (file) onFile(file);
  };

  return (
    <label
      htmlFor={id}
      className={styles.drop}
      data-dragging={arrastrando}
      data-disabled={disabled}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={onDrop}
    >
      <input id={id} type="file" accept=".csv,text/csv" className={styles.input} onChange={onChange} disabled={disabled} />
      <span className={styles.icon} aria-hidden>
        {disabled ? <Loader2 className={styles.spin} size={22} /> : <Upload size={22} />}
      </span>
      <span className={styles.title}>{disabled ? 'Leyendo tu archivo…' : 'Selecciona tu archivo tienda.csv'}</span>
      <span className={styles.hint}>Productos y ventas en un solo archivo</span>
    </label>
  );
}
