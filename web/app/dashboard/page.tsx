"use client";

import Link from "next/link";
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
} from "@mui/material";
import { useAuth } from "@/components/AuthProvider";
import {
  LocalHospital,
  Biotech,
  FitnessCenter,
  ArrowForward,
  Logout,
} from "@mui/icons-material";

const dashboardCards = [
  {
    title: "Health Incidents",
    description: "Track and manage health incidents and logs",
    icon: LocalHospital,
    href: "/incidents",
    color: "#EF4444",
  },
  {
    title: "Lab Results",
    description: "Track lab results over time",
    icon: Biotech,
    href: "/lab-results",
    color: "#3B82F6",
  },
  {
    title: "Workouts",
    description: "View Strava workouts and goals",
    icon: FitnessCenter,
    href: "/workouts",
    color: "#10B981",
  },
];

export default function DashboardPage() {
  const { status, user, signOut } = useAuth();

  if (status !== "authenticated") {
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
            {user?.name || user?.email}
          </Typography>
          <Button
            color="inherit"
            onClick={() => void signOut()}
            startIcon={<Logout />}
            title="Signs you out of all clintonlangosch.com apps"
          >
            Sign out
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
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.title}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
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
