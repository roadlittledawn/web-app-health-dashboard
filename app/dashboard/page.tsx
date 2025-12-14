'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Container,
  Grid,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  LocalHospital,
  Biotech,
  FitnessCenter,
  Chat,
  Assignment,
  ArrowForward,
  Logout,
} from '@mui/icons-material';

const dashboardCards = [
  {
    title: 'Health Logs',
    description: 'Track and view your health issues',
    icon: LocalHospital,
    href: '/health-logs',
    color: '#EF4444',
  },
  {
    title: 'Lab Results',
    description: 'Track lab results over time',
    icon: Biotech,
    href: '/lab-results',
    color: '#3B82F6',
  },
  {
    title: 'Workouts',
    description: 'View Strava workouts and goals',
    icon: FitnessCenter,
    href: '/workouts',
    color: '#10B981',
  },
  {
    title: 'AI Chat',
    description: 'Ask questions about your health data',
    icon: Chat,
    href: '/chat',
    color: '#8B5CF6',
  },
  {
    title: 'Doctor Visit Prep',
    description: 'Generate summaries for appointments',
    icon: Assignment,
    href: '/doctor-prep',
    color: '#F59E0B',
  },
];

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('auth-token');

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/auth-verify', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem('auth-token');
          router.push('/login');
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error('Auth verification failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    document.cookie = 'auth-token=; path=/; max-age=0';
    router.push('/login');
  };

  if (loading) {
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
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <LocalHospital sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Health Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username}
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<Logout />}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Your personal health tracking dashboard
        </Typography>

        <Grid container spacing={3}>
          {dashboardCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Grid item xs={12} sm={6} md={4} key={card.title}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <IconComponent
                        sx={{ fontSize: 40, color: card.color, mr: 1 }}
                      />
                      <Typography variant="h6" component="h2">
                        {card.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {card.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      component={Link}
                      href={card.href}
                      endIcon={<ArrowForward />}
                    >
                      Open
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
