"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  TextField,
  Toolbar,
  Typography,
  Alert,
} from "@mui/material";
import { ArrowBack, Send, SmartToy, Person, Circle } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE = `Hello! I'm your health and fitness assistant. I can help you understand your health data, including:

- **Health Incidents**: Ask about past injuries, pain patterns, or recovery times
- **Workouts**: Get insights on your exercise activity, distances, and achievements
- **Lab Results**: Check your latest lab values like cholesterol levels
- **Fitness Goals**: Track your progress toward your fitness goals

Try asking me questions like:
- "When did I last have an issue with my lower back?"
- "How many miles have I biked this year?"
- "What was my most recent LDL level?"
- "How am I progressing on my running goals?"

What would you like to know?`;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState("");
  const [mcpStatus, setMcpStatus] = useState<"checking" | "ready" | "starting">(
    "checking",
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("auth-token");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth-verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem("auth-token");
          router.push("/login");
          return;
        }

        setAuthChecking(false);
      } catch (error) {
        console.error("Auth verification failed:", error);
        router.push("/login");
      }
    };

    verifyAuth();
  }, [router]);

  useEffect(() => {
    if (authChecking) return;

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem("auth-token");
        const response = await fetch("/api/mcp-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (cancelled) return;

        if (data.status === "ready") {
          setMcpStatus("ready");
          return; // stop polling
        }

        setMcpStatus("starting");
      } catch {
        if (cancelled) return;
        setMcpStatus("starting");
      }

      // Poll every 5 seconds until ready
      timeoutId = setTimeout(checkStatus, 5000);
    };

    checkStatus();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [authChecking]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || loading) {
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setError("");

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    setLoading(true);

    try {
      const token = localStorage.getItem("auth-token");

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to get response");
      }

      const data = await response.json();

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");

      // Add error message as assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, but I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push("/dashboard")}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <SmartToy sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Health Assistant
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {mcpStatus === "ready" ? (
              <Circle sx={{ fontSize: 12, color: "#4caf50" }} />
            ) : (
              <CircularProgress
                size={12}
                sx={{ color: "rgba(255,255,255,0.7)" }}
              />
            )}
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.9)" }}
            >
              {mcpStatus === "ready"
                ? "MCP server ready"
                : mcpStatus === "starting"
                  ? "MCP server waking up..."
                  : "Checking MCP server..."}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="md"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          py: 3,
          overflow: "hidden",
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Paper
          elevation={3}
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Messages container */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              p: 3,
              bgcolor: "background.default",
            }}
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  mb: 3,
                  alignItems: "flex-start",
                }}
              >
                <Box
                  sx={{
                    mr: 2,
                    mt: 0.5,
                    color:
                      message.role === "user"
                        ? "primary.main"
                        : "secondary.main",
                  }}
                >
                  {message.role === "user" ? (
                    <Person fontSize="medium" />
                  ) : (
                    <SmartToy fontSize="medium" />
                  )}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    {message.role === "user" ? "You" : "Assistant"}
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor:
                        message.role === "user"
                          ? "primary.light"
                          : "background.paper",
                      color:
                        message.role === "user"
                          ? "primary.contrastText"
                          : "text.primary",
                    }}
                  >
                    {message.role === "user" ? (
                      <Typography variant="body1">{message.content}</Typography>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <Typography variant="body1" paragraph>
                              {children}
                            </Typography>
                          ),
                          ul: ({ children }) => (
                            <Box component="ul" sx={{ mt: 1, mb: 1, pl: 3 }}>
                              {children}
                            </Box>
                          ),
                          ol: ({ children }) => (
                            <Box component="ol" sx={{ mt: 1, mb: 1, pl: 3 }}>
                              {children}
                            </Box>
                          ),
                          li: ({ children }) => (
                            <Typography component="li" variant="body1">
                              {children}
                            </Typography>
                          ),
                          strong: ({ children }) => (
                            <Typography component="strong" fontWeight="bold">
                              {children}
                            </Typography>
                          ),
                          code: ({ children }) => (
                            <Typography
                              component="code"
                              sx={{
                                bgcolor: "grey.200",
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 0.5,
                                fontFamily: "monospace",
                              }}
                            >
                              {children}
                            </Typography>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </Paper>
                </Box>
              </Box>
            ))}
            {loading && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <SmartToy sx={{ mr: 2, color: "secondary.main" }} />
                <CircularProgress size={24} />
                <Typography
                  variant="body2"
                  sx={{ ml: 2 }}
                  color="text.secondary"
                >
                  Thinking...
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input area */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Ask me about your health data..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                autoFocus
                multiline
                maxRows={4}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !input.trim()}
                sx={{ minWidth: 56 }}
              >
                <Send />
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
