# 🎓 SISTEMA DE CONVERSÃO DE NOTAS

**Data:** 01/11/2025 - 16:10  
**Status:** ✅ IMPLEMENTADO

---

## 🎯 **PROBLEMA RESOLVIDO:**

O banco de dados armazena notas SEMPRE em escala **0-10** (constraint CHECK), mas as turmas podem usar diferentes sistemas de avaliação configurados pelo professor.

---

## 📊 **SISTEMAS SUPORTADOS:**

### **1. Numérico 0-10** (Padrão)
```
Configuração: grading_system = '0-10'
Escala: 0.0 a 10.0
Decimais: 2 casas
```
**Exemplo:**
- Professor dá: `7.5`
- Salva no banco: `7.5`
- Aluno vê: `7.5/10`

---

### **2. Numérico 0-100**
```
Configuração: grading_system = '0-100'
Escala: 0 a 100
Decimais: 0 (inteiro)
```
**Exemplo:**
- Professor dá: `85`
- Converte: (85 ÷ 100) × 10 = `8.5`
- Salva no banco: `8.5`
- Aluno vê: `85/100`

---

### **3. Letras A-F**
```
Configuração: grading_system = 'A-F'
Escala: A, B, C, D, F
```
**Conversão:**
| Letra | Faixa (0-10) | Ponto Médio |
|-------|--------------|-------------|
| A     | 9.0 - 10     | 9.5         |
| B     | 7.0 - 8.9    | 7.95        |
| C     | 5.0 - 6.9    | 5.95        |
| D     | 3.0 - 4.9    | 3.95        |
| F     | 0 - 2.9      | 1.45        |

**Exemplo:**
- Professor dá: `B`
- Converte: ponto médio de 7.0-8.9 = `7.95`
- Salva no banco: `7.95`
- Aluno vê: `B`

---

### **4. Aprovado/Reprovado**
```
Configuração: grading_system = 'pass-fail'
Opções: Aprovado, Reprovado
```
**Conversão:**
| Conceito   | Faixa (0-10) | Ponto Médio |
|------------|--------------|-------------|
| Aprovado   | 6.0 - 10     | 8.0         |
| Reprovado  | 0 - 5.9      | 2.95        |

**Exemplo:**
- Professor dá: `Aprovado`
- Converte: `8.0`
- Salva no banco: `8.0`
- Aluno vê: `Aprovado`

---

### **5. Conceitos (Excelente a Insuficiente)**
```
Configuração: grading_system = 'excellent-poor'
Opções: Excelente, Ótimo, Bom, Regular, Insuficiente
```
**Conversão:**
| Conceito      | Faixa (0-10) | Ponto Médio |
|---------------|--------------|-------------|
| Excelente     | 9.0 - 10     | 9.5         |
| Ótimo         | 7.5 - 8.9    | 8.2         |
| Bom           | 6.0 - 7.4    | 6.7         |
| Regular       | 4.0 - 5.9    | 4.95        |
| Insuficiente  | 0 - 3.9      | 1.95        |

**Exemplo:**
- Professor dá: `Ótimo`
- Converte: `8.2`
- Salva no banco: `8.2`
- Aluno vê: `Ótimo`

---

## 🔄 **FLUXO DE CONVERSÃO:**

### **Ao Salvar (UI → Banco):**
```javascript
// Professor dá nota na escala da turma
const gradeInput = "85"; // ou "B", "Aprovado", etc
const gradingSystem = "0-100"; // da turma

// Converter para escala 0-10
const gradeNormalized = convertToDatabase(gradeInput, gradingSystem);
// Result: 8.5

// Salvar no banco
await supabase
  .from('submissions')
  .update({ grade: 8.5 })
  .eq('id', submissionId);
```

### **Ao Exibir (Banco → UI):**
```javascript
// Buscar do banco
const dbGrade = 8.5; // sempre 0-10
const gradingSystem = "0-100"; // da turma

// Converter para escala da UI
const displayGrade = convertFromDatabase(dbGrade, gradingSystem);
// Result: "85"

// Mostrar para usuário
<span>{displayGrade}/100</span>
```

---

## 💻 **INTERFACE ADAPTATIVA:**

### **Sistema Numérico (0-10, 0-100):**
```jsx
<Input
  type="number"
  min={0}
  max={100} // ou 10
  step={1}  // ou 0.1
  value={grade}
  onChange={(e) => setGrade(e.target.value)}
/>
<p>Escala: 0-100</p>
```

### **Sistema de Letras/Conceitos:**
```jsx
<select value={grade} onChange={(e) => setGrade(e.target.value)}>
  <option value="">Selecione...</option>
  <option value="A">A</option>
  <option value="B">B</option>
  <option value="C">C</option>
  <option value="D">D</option>
  <option value="F">F</option>
</select>
<p>Sistema: A-F</p>
```

---

## 🛠️ **FUNÇÕES UTILITÁRIAS:**

### **`convertToDatabase(grade, system)`**
Converte nota da escala da UI para 0-10 do banco.

```javascript
convertToDatabase("85", "0-100") → 8.5
convertToDatabase("B", "A-F") → 7.95
convertToDatabase("Aprovado", "pass-fail") → 8.0
```

### **`convertFromDatabase(dbGrade, system)`**
Converte nota do banco (0-10) para escala da UI.

```javascript
convertFromDatabase(8.5, "0-100") → "85"
convertFromDatabase(7.95, "A-F") → "B"
convertFromDatabase(8.0, "pass-fail") → "Aprovado"
```

### **`getGradeOptions(system)`**
Retorna opções para select (letras/conceitos) ou null (numérico).

```javascript
getGradeOptions("A-F") → ["A", "B", "C", "D", "F"]
getGradeOptions("0-100") → null
```

### **`isValidGrade(grade, system)`**
Valida se a nota é válida para o sistema.

```javascript
isValidGrade("85", "0-100") → true
isValidGrade("150", "0-100") → false
isValidGrade("B", "A-F") → true
isValidGrade("X", "A-F") → false
```

---

## 📂 **ARQUIVOS CRIADOS/MODIFICADOS:**

### **1. `src/shared/utils/gradeConverter.js`**
```javascript
// Novo arquivo com todas as funções de conversão
export const GRADING_SYSTEMS = { ... };
export function convertToDatabase(grade, system) { ... }
export function convertFromDatabase(dbGrade, system) { ... }
export function getGradeOptions(system) { ... }
export function isValidGrade(grade, system) { ... }
```

### **2. `src/shared/services/correctionService.js`**
```javascript
// Modificado para usar gradeConverter
import { convertToDatabase } from '../utils/gradeConverter';

export const saveCorrection = async (submissionId, correctionData) => {
  // Buscar grading_system da turma
  const gradingSystem = await getGradingSystem(submissionId);
  
  // Converter nota
  const gradeNormalized = convertToDatabase(grade, gradingSystem);
  
  // Salvar no banco
  await supabase.from('submissions').update({ grade: gradeNormalized });
};
```

### **3. `src/modules/teacher/pages/Corrections/components/CorrectionModal.jsx`**
```javascript
// Modificado para UI adaptativa
import { convertFromDatabase, getGradeOptions } from '@/shared/utils/gradeConverter';

const CorrectionModal = ({ submission }) => {
  const gradingSystem = submission.activity?.grading_system;
  const gradeOptions = getGradeOptions(gradingSystem);
  
  // Converter nota do banco para UI
  const initialGrade = convertFromDatabase(submission.grade, gradingSystem);
  
  return (
    <div>
      {gradeOptions ? (
        <select>{/* Dropdown para letras/conceitos */}</select>
      ) : (
        <input type="number" /> {/* Input para numérico */}
      )}
    </div>
  );
};
```

---

## 🧪 **EXEMPLOS DE USO:**

### **Exemplo 1: Turma com escala 0-100**
```
1. Professor cria turma → grading_system = "0-100"
2. Cria atividade → max_score = 100
3. Aluno submete
4. Professor corrige:
   - Input mostra: número 0-100
   - Professor digita: 85
   - Sistema converte: (85/100) × 10 = 8.5
   - Salva no banco: 8.5
   - Toast: "Nota 85 (0-100) foi salva como 8.5/10 no sistema"
5. Aluno vê boletim:
   - Banco tem: 8.5
   - Sistema converte: (8.5/10) × 100 = 85
   - Aluno vê: "85/100"
```

### **Exemplo 2: Turma com letras A-F**
```
1. Professor cria turma → grading_system = "A-F"
2. Cria atividade
3. Aluno submete
4. Professor corrige:
   - Input mostra: dropdown [A, B, C, D, F]
   - Professor seleciona: B
   - Sistema converte: B = 7.95 (ponto médio 7.0-8.9)
   - Salva no banco: 7.95
   - Toast: "Nota B (A-F) foi salva como 7.95/10 no sistema"
5. Aluno vê boletim:
   - Banco tem: 7.95
   - Sistema converte: 7.95 está entre 7.0-8.9 = B
   - Aluno vê: "B"
```

### **Exemplo 3: Turma com Aprovado/Reprovado**
```
1. Professor cria turma → grading_system = "pass-fail"
2. Professor corrige:
   - Input mostra: dropdown [Aprovado, Reprovado]
   - Professor seleciona: Aprovado
   - Sistema converte: Aprovado = 8.0
   - Salva no banco: 8.0
5. Aluno vê: "Aprovado"
```

---

## ⚙️ **CONFIGURAÇÃO POR TURMA:**

### **Ao criar turma:**
```javascript
const { data } = await supabase
  .from('classes')
  .insert({
    name: "Matemática Avançada",
    grading_system: "A-F", // ← AQUI!
    // ...
  });
```

### **Sistemas disponíveis:**
- `"0-10"` - Padrão brasileiro
- `"0-100"` - Percentual
- `"A-F"` - Letras americanas
- `"pass-fail"` - Binário
- `"excellent-poor"` - Conceitos

---

## 🎨 **UI/UX:**

### **Visual para professor:**
```
┌─ Nota Final ─────────────┐
│                          │
│  Sistema: 0-100          │
│  ┌──────────────────┐   │
│  │     85           │   │
│  └──────────────────┘   │
│  Escala: 0-100           │
│                          │
└──────────────────────────┘
```

```
┌─ Nota Final ─────────────┐
│                          │
│  Sistema: A-F            │
│  ┌──────────────────┐   │
│  │  B        ▼      │   │
│  └──────────────────┘   │
│  [A] [B] [C] [D] [F]    │
│                          │
└──────────────────────────┘
```

### **Toast informativo:**
```
ℹ️ Nota Convertida
Nota "85" (0-100) foi salva como 8.5/10 no sistema
```

---

## 📊 **BENEFÍCIOS:**

### **✅ Flexibilidade:**
- Cada turma pode usar o sistema que preferir
- Professor familiar com seu sistema

### **✅ Consistência:**
- Banco sempre em escala padrão (0-10)
- Fácil calcular médias e estatísticas

### **✅ Transparência:**
- Toast mostra conversão
- Professor sabe exatamente o que é salvo

### **✅ Simplicidade:**
- Conversão automática
- Professor só vê sua escala escolhida

---

## 🔒 **CONSTRAINT DO BANCO:**

```sql
submissions.grade NUMERIC(5,2) CHECK (grade >= 0 AND grade <= 10)
```

**Por que manter?**
- Padronização interna
- Cálculos simplificados
- Relatórios consistentes
- Comparações entre turmas

**Conversão garante:**
- Nenhum valor fora do range
- Compatibilidade total
- Zero erros 400

---

## 🚀 **PRÓXIMOS PASSOS:**

1. ✅ Implementado conversão bidirecional
2. ✅ UI adaptativa por sistema
3. ✅ Validação por sistema
4. ✅ Toast informativo
5. ⏳ Tela de configuração de turma (selecionar grading_system)
6. ⏳ Boletim do aluno com conversão
7. ⏳ Relatórios com conversão

---

**SISTEMA DE CONVERSÃO IMPLEMENTADO! 🎓✨**
