"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  IconButton,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Collapse,
} from "@mui/material";
import {
  ArrowBack,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  FitnessCenter,
} from "@mui/icons-material";
import { PopulatedWorkoutProgram } from "@/types/workout-programs";

export default function WorkoutSessionPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;

  const [program, setProgram] = useState<PopulatedWorkoutProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(
    new Set(),
  );
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    fetchProgram();
  }, [programId]);

  const fetchProgram = async () => {
    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch(`/api/workout-programs?id=${programId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch program");

      const data = await response.json();
      setProgram(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExerciseComplete = (index: number) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedExercises(newCompleted);
  };

  const toggleExerciseExpanded = (index: number) => {
    const newExpanded = new Set(expandedExercises);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedExercises(newExpanded);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    )?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const handleFinishWorkout = () => {
    router.push("/workouts/programs");
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

  if (!program) {
    return (
      <Container>
        <Alert severity="error">Program not found</Alert>
      </Container>
    );
  }

  const completionPercentage =
    program.exercises.length > 0
      ? Math.round((completedExercises.size / program.exercises.length) * 100)
      : 0;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push("/workouts/programs")}
          >
            <ArrowBack />
          </IconButton>
          <FitnessCenter sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {program.name}
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {completedExercises.size} / {program.exercises.length}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6">Progress</Typography>
              <Typography variant="h4" color="primary">
                {completionPercentage}%
              </Typography>
            </Box>
            <Box
              sx={{
                width: "100%",
                height: 8,
                bgcolor: "grey.300",
                borderRadius: 1,
                mt: 2,
              }}
            >
              <Box
                sx={{
                  width: `${completionPercentage}%`,
                  height: "100%",
                  bgcolor: "primary.main",
                  borderRadius: 1,
                  transition: "width 0.3s",
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {program.exercises.map((pe, index) => {
          const isCompleted = completedExercises.has(index);
          const isExpanded = expandedExercises.has(index);

          return (
            <Card 
              key={index} 
              sx={{ 
                mb: 2, 
                position: 'relative',
                overflow: 'hidden',
                bgcolor: isCompleted ? 'success.light' : 'background.paper',
                transition: 'background-color 0.5s ease-in-out',
                '&::before': isCompleted ? {
                  content: '""',
                  position: 'absolute',
                  top: '24px',
                  left: '24px',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  opacity: 0,
                  transform: 'translate(-50%, -50%)',
                  animation: 'ripple 0.8s ease-out',
                } : {},
                '@keyframes ripple': {
                  '0%': {
                    width: '48px',
                    height: '48px',
                    opacity: 0.6,
                  },
                  '100%': {
                    width: '1600px',
                    height: '1600px',
                    opacity: 0,
                  },
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <Checkbox
                    checked={isCompleted}
                    onChange={() => toggleExerciseComplete(index)}
                    icon={<CheckCircle />}
                    checkedIcon={<CheckCircle />}
                    sx={{
                      color: 'action.active',
                      '&.Mui-checked': {
                        color: 'success.dark',
                      },
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        textDecoration: isCompleted ? "line-through" : "none",
                      }}
                    >
                      {pe.exercise.name}
                    </Typography>
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Chip
                        label={
                          pe.exercise.isTimeBased
                            ? `${pe.duration_seconds}s`
                            : `${pe.sets} sets × ${pe.reps} reps`
                        }
                        color="primary"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    </Box>
                    {pe.exercise.requiredEquipment.length > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Equipment: {pe.exercise.requiredEquipment.join(", ")}
                      </Typography>
                    )}

                    <Button
                      size="small"
                      onClick={() => toggleExerciseExpanded(index)}
                      endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                      sx={{ mt: 1 }}
                    >
                      {isExpanded ? "Hide" : "Show"} Details
                    </Button>

                    <Collapse in={isExpanded}>
                      <Box sx={{ mt: 2 }}>
                        {pe.exercise.description && (
                          <Typography variant="body2" paragraph>
                            {pe.exercise.description}
                          </Typography>
                        )}
                        {pe.exercise.media.length > 0 &&
                          pe.exercise.media[0].type === "youtube" && (
                            <Box sx={{ mt: 2 }}>
                              {getYouTubeEmbedUrl(pe.exercise.media[0].url) && (
                                <iframe
                                  width="100%"
                                  height="315"
                                  src={
                                    getYouTubeEmbedUrl(
                                      pe.exercise.media[0].url,
                                    )!
                                  }
                                  title={pe.exercise.name}
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              )}
                            </Box>
                          )}
                      </Box>
                    </Collapse>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}

        {program.exercises.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              This program has no exercises yet.
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleFinishWorkout}
            startIcon={<CheckCircle />}
          >
            Finish Workout
          </Button>
        </Box>
      </Container>
    </>
  );
}
