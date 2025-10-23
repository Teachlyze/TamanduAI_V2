# 🚀 Plano de Ação - Reestruturação TamanduAI V2

## 📅 Cronograma Detalhado

### **FASE 1: SETUP E FUNDAÇÃO** (Dia 1 - 6h)

#### Manhã (3h)
- [ ] **1.1** Criar estrutura completa de pastas (30min)
  ```bash
  cd TamanduAI_V2/src
  mkdir -p shared/{components/{ui,layout,common},services,hooks,contexts,utils,constants}
  mkdir -p features/{auth,notifications,profile,settings}/{pages,components}
  mkdir -p modules/{student,teacher,school}/{pages,components,hooks}
  ```

- [ ] **1.2** Copiar Services (1h)
  ```bash
  # Do projeto antigo para V2
  cp -r ../src/services/* src/shared/services/
  ```
  - Verificar imports
  - Atualizar paths para `@/shared/services`

- [ ] **1.3** Copiar Utils, Hooks, Contexts, Constants (1h)
  ```bash
  cp -r ../src/utils/* src/shared/utils/
  cp -r ../src/hooks/* src/shared/hooks/
  cp -r ../src/contexts/* src/shared/contexts/
  cp -r ../src/constants/* src/shared/constants/
  ```

- [ ] **1.4** Configurar Path Aliases no vite.config.js (30min)
  ```javascript
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/modules': path.resolve(__dirname, './src/modules')
    }
  }
  ```

#### Tarde (3h)
- [ ] **1.5** Criar Layout Base (2h)
  - Header.jsx com profile dropdown, theme toggle, notifications
  - Footer.jsx simples
  - MainLayout.jsx wrapper
  - RoleLayout.jsx (detecta role e carrega sidebar correto)

- [ ] **1.6** Criar Common Components (1h)
  - EmptyState.jsx
  - ErrorState.jsx
  - ConfirmDialog.jsx
  - DataTable.jsx (básico)

---

### **FASE 2: AUTH & SHARED FEATURES** (Dias 2-3 - 12h)

#### Dia 2 - Manhã (4h)
- [ ] **2.1** Feature: Auth (4h)
  - [ ] LoginPage.jsx (adaptar do antigo)
  - [ ] RegisterPage.jsx (adaptar do antigo)
  - [ ] LoginForm.jsx (componente)
  - [ ] RegisterForm.jsx (componente)
  - [ ] auth/routes.jsx
  - Testar autenticação completa

#### Dia 2 - Tarde (4h)
- [ ] **2.2** Feature: Profile (2h)
  - [ ] ProfilePage.jsx
  - [ ] EditProfilePage.jsx
  - [ ] ProfileCard.jsx
  - [ ] AvatarUpload.jsx
  - [ ] profile/routes.jsx

- [ ] **2.3** Feature: Settings (2h)
  - [ ] SettingsPage.jsx
  - [ ] ThemeToggle.jsx (component)
  - [ ] AccessibilitySettings.jsx
  - [ ] PrivacySettings.jsx
  - [ ] settings/routes.jsx

#### Dia 3 - Manhã (4h)
- [ ] **2.4** Feature: Notifications (4h)
  - [ ] NotificationCenter.jsx
  - [ ] NotificationCard.jsx
  - [ ] NotificationBadge.jsx
  - [ ] NotificationList.jsx
  - [ ] notifications/routes.jsx
  - Integrar com NotificationService
  - Testar notificações real-time

---

### **FASE 3: STUDENT MODULE** (Dias 4-5 - 12h)

#### Dia 4 - Manhã (4h)
- [ ] **3.1** Student Dashboard (2h)
  - [ ] StudentDashboard.jsx
  - [ ] Dashboard stats cards
  - [ ] Upcoming activities
  - [ ] Recent grades

- [ ] **3.2** Student Classes (2h)
  - [ ] ClassesList.jsx
  - [ ] ClassCard.jsx (component)
  - [ ] JoinClass.jsx

#### Dia 4 - Tarde (4h)
- [ ] **3.3** Student Activities (4h)
  - [ ] ActivitiesList.jsx
  - [ ] ActivityDetails.jsx
  - [ ] SubmitActivity.jsx
  - [ ] ActivityCard.jsx (component)

#### Dia 5 - Manhã (4h)
- [ ] **3.4** Student Performance (2h)
  - [ ] MyGrades.jsx
  - [ ] PerformanceAnalytics.jsx
  - [ ] GradeCard.jsx (component)

- [ ] **3.5** Student Gamification (2h)
  - [ ] GamificationDashboard.jsx
  - [ ] Ranking.jsx
  - [ ] XPProgressBar.jsx (component)

---

### **FASE 4: TEACHER MODULE** (Dias 6-9 - 18h)

#### Dia 6 - Manhã (4h)
- [ ] **4.1** Teacher Dashboard (2h)
  - [ ] TeacherDashboard.jsx
  - [ ] Classes overview
  - [ ] Pending submissions
  - [ ] Quick stats

- [ ] **4.2** Teacher Classes List (2h)
  - [ ] ClassesList.jsx
  - [ ] CreateClass.jsx
  - [ ] ClassCard.jsx

#### Dia 6 - Tarde (4h)
- [ ] **4.3** Class Details - Part 1 (4h)
  - [ ] ClassDetails.jsx (container com tabs)
  - [ ] ClassMembers.jsx (tab)
  - [ ] ClassFeed.jsx (tab - adaptar do antigo)

#### Dia 7 - Manhã (4h)
- [ ] **4.4** Class Details - Part 2 (4h)
  - [ ] ClassGrades.jsx (adaptar do antigo)
  - [ ] ClassMaterials.jsx (adaptar do antigo)
  - [ ] ClassAttendance.jsx (adaptar do antigo)

#### Dia 7 - Tarde (4h)
- [ ] **4.5** Activities Management (4h)
  - [ ] ActivitiesList.jsx
  - [ ] CreateActivity.jsx (adaptar ActivityBuilder)
  - [ ] EditActivity.jsx
  - [ ] DraftsPage.jsx

#### Dia 8 - Manhã (4h)
- [ ] **4.6** Grading System (4h)
  - [ ] GradingQueue.jsx (adaptar do antigo)
  - [ ] GradingInterface.jsx (adaptar do antigo)
  - [ ] RubricManager.jsx (adaptar do antigo)

#### Dia 8 - Tarde (2h)
- [ ] **4.7** Question Bank (2h)
  - [ ] QuestionBankPage.jsx (adaptar do antigo)
  - [ ] CreateQuestion.jsx

---

### **FASE 5: SCHOOL MODULE** (Dias 9-11 - 15h)

#### Dia 9 - Manhã (4h)
- [ ] **5.1** School Dashboard (2h)
  - [ ] SchoolDashboard.jsx (adaptar do antigo)
  - [ ] School stats
  - [ ] Quick actions

- [ ] **5.2** School Teachers (2h)
  - [ ] TeachersList.jsx (adaptar do antigo)
  - [ ] InviteTeacher.jsx (adaptar do antigo)
  - [ ] TeacherCard.jsx

#### Dia 9 - Tarde (4h)
- [ ] **5.3** School Students & Classes (4h)
  - [ ] StudentsList.jsx (adaptar do antigo)
  - [ ] ClassesList.jsx (adaptar do antigo)
  - [ ] StudentCard.jsx
  - [ ] ClassCard.jsx

#### Dia 10 - Manhã (4h)
- [ ] **5.4** School Analytics (2h)
  - [ ] SchoolAnalytics.jsx (adaptar do antigo)
  - [ ] MLInsights.jsx (adaptar do antigo)

- [ ] **5.5** School Communications (2h)
  - [ ] CommunicationsPage.jsx (adaptar do antigo)
  - [ ] AnnouncementForm.jsx

#### Dia 10 - Tarde (3h)
- [ ] **5.6** School Reports & Settings (3h)
  - [ ] ReportsPage.jsx (adaptar do antigo)
  - [ ] RankingPage.jsx (adaptar do antigo)
  - [ ] SchoolSettings.jsx (adaptar do antigo)
  - [ ] RewardSettings.jsx (adaptar do antigo)

---

### **FASE 6: ROUTING & INTEGRATION** (Dia 11 - 4h)

#### Dia 11 - Manhã (4h)
- [ ] **6.1** Routes Configuration (2h)
  - [ ] src/routes.jsx (central)
  - [ ] student/routes.jsx
  - [ ] teacher/routes.jsx
  - [ ] school/routes.jsx
  - Lazy loading configurado

- [ ] **6.2** Sidebars (2h)
  - [ ] StudentSidebar.jsx (adaptar do antigo)
  - [ ] TeacherSidebar.jsx (adaptar do antigo)
  - [ ] SchoolSidebar.jsx (adaptar do antigo)

---

### **FASE 7: TESTES & AJUSTES** (Dias 12-13 - 10h)

#### Dia 12 - Manhã (4h)
- [ ] **7.1** Testes Student Module (2h)
  - Testar todas as páginas
  - Verificar navegação
  - Testar funcionalidades
  - Corrigir bugs

- [ ] **7.2** Testes Teacher Module (2h)
  - Testar todas as páginas
  - Verificar criação de atividades
  - Testar correções
  - Corrigir bugs

#### Dia 12 - Tarde (3h)
- [ ] **7.3** Testes School Module (2h)
  - Testar todas as páginas
  - Verificar gestão de professores
  - Testar analytics
  - Corrigir bugs

- [ ] **7.4** Testes de Integração (1h)
  - Testar troca de roles
  - Verificar permissões
  - Testar notificações
  - Verificar gamificação

#### Dia 13 - Manhã (3h)
- [ ] **7.5** Ajustes Finais (3h)
  - Revisar UI/UX
  - Corrigir responsividade
  - Otimizar performance
  - Verificar acessibilidade
  - Code review

---

## 📊 CHECKPOINT DIÁRIO

Ao final de cada dia, verificar:

### ✅ Checklist Diário
- [ ] Código commitado no git
- [ ] Build sem erros
- [ ] Funcionalidades testadas manualmente
- [ ] Dark mode funcionando
- [ ] Responsivo em mobile
- [ ] Console sem erros

### 📝 Documento de Progresso
Criar arquivo `PROGRESSO.md` e atualizar diariamente:
```markdown
## Dia X - DD/MM/YYYY
- ✅ Completado: [lista]
- ⚠️ Pendente: [lista]
- 🐛 Bugs encontrados: [lista]
- ⏱️ Tempo gasto: Xh
```

---

## 🎯 PRIORIZAÇÃO

### 🔴 Prioridade ALTA (Fazer primeiro)
1. Setup básico (Fase 1)
2. Auth (essencial para tudo)
3. Student Dashboard (mais simples)
4. Teacher Classes & Activities (core do produto)

### 🟡 Prioridade MÉDIA (Fazer depois)
1. Grading System
2. School Module
3. Analytics ML

### 🟢 Prioridade BAIXA (Fazer no final)
1. Gamification avançada
2. Comunicações
3. Reports avançados

---

## 🛠️ FERRAMENTAS DE APOIO

### Scripts Úteis
```bash
# Verificar imports quebrados
npm run lint

# Rebuild rápido
npm run build

# Rodar dev
npm run dev

# Verificar tipos
npm run type-check
```

### Git Workflow
```bash
# Feature branch
git checkout -b feature/student-module

# Commit frequente
git add .
git commit -m "feat: add student dashboard"

# Push daily
git push origin feature/student-module
```

---

## 📈 MÉTRICAS DE SUCESSO

### Ao Final do Projeto
- [ ] 100% das páginas funcionando
- [ ] 0 erros de build
- [ ] 0 warnings críticos
- [ ] Dark mode 100% funcional
- [ ] Responsivo em mobile
- [ ] Performance > 80 (Lighthouse)
- [ ] Acessibilidade > 90 (Lighthouse)
- [ ] Cobertura de testes > 70%

---

## 🚨 BLOQUEADORES COMUNS

### Problema: Imports não resolvidos
**Solução**: Verificar path aliases no vite.config.js

### Problema: Services não funcionam
**Solução**: Verificar se Supabase está configurado corretamente

### Problema: Dark mode quebrado
**Solução**: Verificar classes Tailwind (`bg-white dark:bg-slate-900`)

### Problema: Componentes não carregam
**Solução**: Verificar lazy loading e Suspense

---

## 💡 DICAS DE PRODUTIVIDADE

1. **Use snippets** para components repetitivos
2. **Copie e adapte** do projeto antigo (não reinvente)
3. **Teste frequentemente** (não acumule bugs)
4. **Commit pequeno e frequente**
5. **Documente decisões importantes**
6. **Peça ajuda quando travar** (não perca tempo)

---

## 🎉 CELEBRAÇÃO DE MARCOS

- ✅ Fase 1 completa → 🍕 Pizza!
- ✅ Student Module completo → 🎮 1h de jogo
- ✅ Teacher Module completo → 🍿 Filme
- ✅ School Module completo → 🎊 Celebração final
- ✅ Projeto 100% completo → 🏖️ Férias merecidas!

---

**Boa sorte! 🚀**
