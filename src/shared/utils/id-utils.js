import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// Namespace fixo para geração determinística de UUID v5
const NAMESPACE = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

export function generateId(prefix = '') {
  return `${prefix}${uuidv4()}`;
}

export function generateDeterministicId(name, prefix = '') {
  return `${prefix}${uuidv5(name, NAMESPACE)}`;
}
