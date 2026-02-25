import axios from "axios";

const api = axios.create({
  // baseURL: "http://localhost:5000", // <--- REMOVED: Causes CORS. Use Vite proxy instead.
  withCredentials: true,
});

// AUTH ROUTES
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data),

  register: (data: { email: string; password: string }) =>
    api.post("/api/auth/register", data),

  logout: () => api.post("/api/auth/logout"),
};

// CHAT ROUTES
export const chatApi = {
  getConversations: () => api.get("/api/conversations"),
  createConversation: (data: any) => api.post("/api/conversations", data),
  deleteConversation: (id: number) => api.delete(`/api/conversations/${id}`),

  getMessages: (cid: number) =>
    api.get(`/api/conversations/${cid}/messages`),

  sendMessage: (cid: number, content: string, model?: string) =>
    api.post(`/api/conversations/${cid}/messages`, { content, model }),

  sendMessageStream: async (cid: number, content: string, onChunk: (chunk: string) => void, model?: string) => {
    const response = await fetch(`/api/conversations/${cid}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, model }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  },

  health: async () => {
    const res = await api.get("/api/health");
    return res.data;
  },
};

export default api;