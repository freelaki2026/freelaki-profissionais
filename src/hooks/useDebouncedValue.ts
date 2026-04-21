import { useEffect, useState } from "react";

/**
 * Retorna o valor após `delay` ms sem mudanças.
 * Útil para inputs de busca, filtros e qualquer trigger pesado.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

export default useDebouncedValue;
