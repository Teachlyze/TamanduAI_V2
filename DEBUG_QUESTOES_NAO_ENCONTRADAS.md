# 🔍 DEBUG: QUESTÕES NÃO ENCONTRADAS

**Problema:** "❓ Total de questões encontradas: 0"

---

## 📊 **LOGS ATUAIS:**

```
📊 Performance Summary: {
  "avgGrade": "10.0",
  "totalActivities": 1,
  "recentGrades": [
    {
      "grade": 10,
      "maxScore": 100,
      "subject": "Matemática",
      "activityTitle": "dfsd - Cópia"
      // ❌ SEM "questions"!
    }
  ]
}
❓ Total de questões encontradas: 0
```

---

## 🔍 **PRÓXIMO PASSO:**

### **1. Hard Reload e Ver Novos Logs:**
```
Ctrl + Shift + R
Ir em Desempenho
Gerar Recomendações
Abrir Console (F12)
```

### **2. Procurar por:**
```
🔍 Detailed Submissions: [...]
📝 Activity content: {...}
```

---

## 📝 **POSSÍVEIS CENÁRIOS:**

### **Cenário A: Content está vazio**
```javascript
📝 Activity content: {
  title: "dfsd - Cópia",
  hasContent: false,  // ❌
  contentKeys: [],
  questions: undefined,
  answers: []
}
```

**Diagnóstico:** A atividade não tem questões salvas

**Solução:** 
- Criar uma atividade com questões
- Ou verificar se a atividade tem questões no banco:
```sql
SELECT id, title, content 
FROM activities 
WHERE title = 'dfsd - Cópia';
```

---

### **Cenário B: Content tem estrutura diferente**
```javascript
📝 Activity content: {
  title: "dfsd - Cópia",
  hasContent: true,  // ✅
  contentKeys: ['items', 'sections', 'problems'],  // ⚠️ Não é 'questions'!
  questions: undefined,
  answers: [...]
}
```

**Diagnóstico:** Questões estão em outro campo (não `questions`)

**Solução:** Ajustar código para buscar no campo correto:
```javascript
// Verificar contentKeys e adaptar
const questionsField = activity.content.questions 
  || activity.content.items 
  || activity.content.problems;
```

---

### **Cenário C: Respostas não estão linkadas**
```javascript
📝 Activity content: {
  title: "dfsd - Cópia",
  hasContent: true,
  contentKeys: ['questions'],  // ✅
  questions: [
    { id: 'q1', text: '2+2', correctAnswer: '4' }
  ],  // ✅ TEM QUESTÕES!
  answers: []  // ❌ MAS SEM RESPOSTAS!
}
```

**Diagnóstico:** Aluno respondeu mas `answers` não foi encontrado

**Solução:** Verificar se tabela `answers` tem os dados:
```sql
SELECT * FROM answers 
WHERE submission_id = 'xxx';
```

---

### **Cenário D: Question_id não bate**
```javascript
📝 Activity content: {
  questions: [
    { id: 'abc123', text: '2+2' }  // ⚠️ ID complexo
  ],
  answers: [
    { question_id: 'question_0', answer_json: '7' }  // ⚠️ ID diferente
  ]
}
```

**Diagnóstico:** IDs não batem, match falha

**Solução:** Ajustar lógica de match:
```javascript
const studentAnswer = submission.answers?.find(a => 
  a.question_id === q.id ||           // Exato
  a.question_id === `question_${idx}` || // Padrão
  a.question_id === idx.toString()    // Index como string
);
```

---

## 🧪 **TESTE RÁPIDO:**

### **Verificar no Supabase Dashboard:**

```sql
-- 1. Ver estrutura da atividade
SELECT 
  id,
  title,
  content,
  jsonb_pretty(content) as content_formatted
FROM activities
WHERE title LIKE '%dfsd%'
LIMIT 1;

-- 2. Ver submissions desta atividade
SELECT 
  s.id,
  s.grade,
  s.activity_id,
  s.student_id,
  COUNT(a.id) as answers_count
FROM submissions s
LEFT JOIN answers a ON a.submission_id = s.id
WHERE s.activity_id = (
  SELECT id FROM activities WHERE title LIKE '%dfsd%' LIMIT 1
)
GROUP BY s.id;

-- 3. Ver respostas específicas
SELECT 
  a.question_id,
  a.answer_json,
  a.points_earned
FROM answers a
WHERE a.submission_id = 'xxx';  -- ID da submission
```

---

## 🔧 **CÓDIGO ADAPTÁVEL:**

Se a estrutura for diferente, vou adaptar o código:

```javascript
// Versão flexível que busca em vários campos
const extractQuestions = (activity, submission) => {
  const questions = [];
  
  // Tentar vários campos possíveis
  const possibleFields = [
    'questions',
    'items',
    'problems',
    'questionList',
    'quiz',
    'test'
  ];
  
  let questionsData = null;
  for (const field of possibleFields) {
    if (activity.content?.[field]) {
      questionsData = activity.content[field];
      console.log(`✅ Questões encontradas em: ${field}`);
      break;
    }
  }
  
  if (!questionsData || !Array.isArray(questionsData)) {
    console.warn('❌ Nenhum campo de questões encontrado');
    return [];
  }
  
  questionsData.forEach((q, idx) => {
    // Tentar múltiplos formatos de ID
    const possibleIds = [
      q.id,
      q._id,
      q.questionId,
      `question_${idx}`,
      idx.toString()
    ];
    
    const studentAnswer = submission.answers?.find(a => 
      possibleIds.includes(a.question_id)
    );
    
    if (studentAnswer) {
      questions.push({
        question: q.text || q.question || q.prompt || q.title,
        studentAnswer: extractAnswer(studentAnswer.answer_json),
        correctAnswer: q.correctAnswer || q.correct_answer || q.answer,
        isCorrect: (studentAnswer.points_earned || 0) > 0
      });
    }
  });
  
  return questions;
};
```

---

## ✅ **AÇÃO IMEDIATA:**

1. **Fazer Hard Reload:**
   ```
   Ctrl + Shift + R
   ```

2. **Gerar Recomendações**

3. **Ver Console e procurar:**
   ```
   🔍 Detailed Submissions
   📝 Activity content
   ```

4. **Copiar e colar aqui:**
   - O que aparece em `contentKeys`
   - O que aparece em `questions`
   - O que aparece em `answers`

5. **Baseado nisso, vou ajustar o código!**

---

## 🎯 **RESULTADO ESPERADO:**

Depois de identificar a estrutura correta:

```javascript
📝 Activity content: {
  title: "Quiz de Matemática",
  hasContent: true,
  contentKeys: ['questions'],  // ou 'items', 'problems', etc
  questions: [
    { id: 'q1', text: '2+2', correctAnswer: '4' }
  ],
  answers: [
    { question_id: 'q1', answer_json: { answer: '7' }, points_earned: 0 }
  ]
}
```

**Então questões serão enviadas para IA! ✅**

---

**🔍 AGUARDANDO LOGS DO CONSOLE PARA DIAGNOSTICAR! 📊**
