'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
  Alert,
  Slider,
  OutlinedInput,
} from '@mui/material';
import {
  ArrowBack,
  Save,
} from '@mui/icons-material';

export default function AddHealthLogPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    issue_type: '',
    pain_level: 5,
    description: '',
    incident_id: '',
    body_area: '',
    status: 'active',
    timestamp: new Date().toISOString().slice(0, 16),
    activities: [] as string[],
    triggers: [] as string[],
    symptoms: [] as string[],
  });

  const [activityInput, setActivityInput] = useState('');
  const [triggerInput, setTriggerInput] = useState('');
  const [symptomInput, setSymptomInput] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem('auth-token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/health-logs-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date(formData.timestamp).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create health log');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/health-logs');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleAddItem = (type: 'activities' | 'triggers' | 'symptoms', value: string) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [type]: [...formData[type], value.trim()],
      });
      if (type === 'activities') setActivityInput('');
      if (type === 'triggers') setTriggerInput('');
      if (type === 'symptoms') setSymptomInput('');
    }
  };

  const handleRemoveItem = (type: 'activities' | 'triggers' | 'symptoms', index: number) => {
    setFormData({
      ...formData,
      [type]: formData[type].filter((_, i) => i !== index),
    });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Button
            color="inherit"
            component={Link}
            href="/health-logs"
            startIcon={<ArrowBack />}
          >
            Back to Health Logs
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            Add Health Log
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Health log created successfully! Redirecting...
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Issue Type"
                    value={formData.issue_type}
                    onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                    placeholder="e.g., back_pain, knee_pain"
                    helperText="Use underscores for multi-word types"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Body Area"
                    value={formData.body_area}
                    onChange={(e) => setFormData({ ...formData, body_area: e.target.value })}
                    placeholder="e.g., lower back, right knee"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Incident ID"
                    value={formData.incident_id}
                    onChange={(e) => setFormData({ ...formData, incident_id: e.target.value })}
                    placeholder="e.g., back_2024_12_001"
                    helperText="Groups related logs together"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="improving">Improving</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="datetime-local"
                    label="Timestamp"
                    value={formData.timestamp}
                    onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography gutterBottom>
                    Pain Level: {formData.pain_level}/10
                  </Typography>
                  <Slider
                    value={formData.pain_level}
                    onChange={(_, value) => setFormData({ ...formData, pain_level: value as number })}
                    min={1}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                    color={formData.pain_level >= 8 ? 'error' : formData.pain_level >= 5 ? 'warning' : 'success'}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    multiline
                    rows={4}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the health issue in detail..."
                  />
                </Grid>

                {/* Symptoms */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Symptoms
                  </Typography>
                  <Box display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem('symptoms', symptomInput);
                        }
                      }}
                      placeholder="Add symptom and press Enter"
                    />
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {formData.symptoms.map((symptom, idx) => (
                      <Chip
                        key={idx}
                        label={symptom}
                        onDelete={() => handleRemoveItem('symptoms', idx)}
                      />
                    ))}
                  </Box>
                </Grid>

                {/* Activities */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Activities Before/During
                  </Typography>
                  <Box display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      value={activityInput}
                      onChange={(e) => setActivityInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem('activities', activityInput);
                        }
                      }}
                      placeholder="Add activity and press Enter"
                    />
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {formData.activities.map((activity, idx) => (
                      <Chip
                        key={idx}
                        label={activity}
                        onDelete={() => handleRemoveItem('activities', idx)}
                      />
                    ))}
                  </Box>
                </Grid>

                {/* Triggers */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Potential Triggers
                  </Typography>
                  <Box display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      value={triggerInput}
                      onChange={(e) => setTriggerInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem('triggers', triggerInput);
                        }
                      }}
                      placeholder="Add trigger and press Enter"
                    />
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {formData.triggers.map((trigger, idx) => (
                      <Chip
                        key={idx}
                        label={trigger}
                        onDelete={() => handleRemoveItem('triggers', idx)}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      component={Link}
                      href="/health-logs"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Health Log'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
