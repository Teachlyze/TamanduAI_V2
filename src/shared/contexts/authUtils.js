export const simulateLogin = async (email) => {
  // Simulação de login - substituir por Supabase
  const mockUser = {
    id: '1',
    email,
    name: email.split('@')[0],
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
  };
  
  return mockUser;
};

export const simulateRegister = async (email, name, role) => {
  // Simulação de registro - substituir por Supabase
  const mockUser = {
    id: Date.now().toString(),
    email,
    name,
    role,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
  };
  
  return mockUser;
};
