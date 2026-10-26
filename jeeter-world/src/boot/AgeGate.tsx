import { useState, type FormEvent } from 'react';
import { bus } from '../events/bus.ts';
import { useWorld } from '../store/world.ts';
import { useT } from '../ui/useT.ts';
import { checkBirthdate } from './age.ts';

export function AgeGate() {
  const t = useT();
  const set = useWorld((s) => s.set);
  const [invalid, setInvalid] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const result = checkBirthdate(Number(f.get('year')), Number(f.get('month')), Number(f.get('day')));
    bus.emit({ type: 'age_gate', result });
    if (result === 'invalid') return setInvalid(true);
    set(result === 'pass' ? { ageVerified: true } : { ageDenied: true });
  }

  const field = (name: string, label: string, max: number, width: string) => (
    <label className="field" style={{ width }}>
      <span>{label}</span>
      <input name={name} inputMode="numeric" pattern="[0-9]*" maxLength={max} required autoComplete={`bday-${name}`} />
    </label>
  );

  return (
    <div className="screen" role="dialog" aria-modal="true" aria-labelledby="age-title">
      <form className="card" onSubmit={submit} noValidate>
        <h1 id="age-title">{t('ageGate.title')}</h1>
        <p>{t('ageGate.body')}</p>
        <div className="row">
          {field('month', t('ageGate.month'), 2, '4.5rem')}
          {field('day', t('ageGate.day'), 2, '4.5rem')}
          {field('year', t('ageGate.year'), 4, '6rem')}
        </div>
        {invalid && <p role="alert" className="error">{t('ageGate.invalid')}</p>}
        <button type="submit" className="primary">{t('ageGate.submit')}</button>
      </form>
    </div>
  );
}
