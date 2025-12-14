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
} from '@mui/material';
import {
  ArrowBack,
  Save,
} from '@mui/icons-material';

export default function AddLabResultPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().slice(0, 10),
    test_type: 'lipid_panel',
    ordered_by: '',
    lab_name: '',
    notes: '',
    total_cholesterol: { value: '', unit: 'mg/dL', min: 0, max: 200 },
    ldl: { value: '', unit: 'mg/dL', min: 0, max: 100 },
    hdl: { value: '', unit: 'mg/dL', min: 40, max: 200 },
    triglycerides: { value: '', unit: 'mg/dL', min: 0, max: 150 },
  });

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
      // Build lab result payload
      const payload: any = {
        test_date: formData.test_date,
        test_type: formData.test_type,
        ordered_by: formData.ordered_by,
        lab_name: formData.lab_name || undefined,
        notes: formData.notes || undefined,
      };

      // Add lipid panel values if provided
      if (formData.total_cholesterol.value) {
        payload.total_cholesterol = {
          value: parseFloat(formData.total_cholesterol.value),
          unit: formData.total_cholesterol.unit,
          reference_range: {
            min: formData.total_cholesterol.min,
            max: formData.total_cholesterol.max,
          },
        };
      }

      if (formData.ldl.value) {
        payload.ldl_cholesterol = {
          value: parseFloat(formData.ldl.value),
          unit: formData.ldl.unit,
          reference_range: {
            min: formData.ldl.min,
            max: formData.ldl.max,
          },
        };
      }

      if (formData.hdl.value) {
        payload.hdl_cholesterol = {
          value: parseFloat(formData.hdl.value),
          unit: formData.hdl.unit,
          reference_range: {
            min: formData.hdl.min,
            max: formData.hdl.max,
          },
        };
      }

      if (formData.triglycerides.value) {
        payload.triglycerides = {
          value: parseFloat(formData.triglycerides.value),
          unit: formData.triglycerides.unit,
          reference_range: {
            min: formData.triglycerides.min,
            max: formData.triglycerides.max,
          },
        };
      }

      const response = await fetch('/api/lab-results-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create lab result');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/lab-results');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Button
            color="inherit"
            component={Link}
            href="/lab-results"
            startIcon={<ArrowBack />}
          >
            Back to Lab Results
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            Add Lab Result
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
            Lab result created successfully! Redirecting...
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
                    type="date"
                    label="Test Date"
                    value={formData.test_date}
                    onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Test Type</InputLabel>
                    <Select
                      value={formData.test_type}
                      label="Test Type"
                      onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                    >
                      <MenuItem value="lipid_panel">Lipid Panel</MenuItem>
                      <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Ordered By (Doctor)"
                    value={formData.ordered_by}
                    onChange={(e) => setFormData({ ...formData, ordered_by: e.target.value })}
                    placeholder="Dr. Smith"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Lab Name"
                    value={formData.lab_name}
                    onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                    placeholder="LabCorp"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Lipid Panel Values
                  </Typography>
                </Grid>

                {/* Total Cholesterol */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Total Cholesterol"
                    value={formData.total_cholesterol.value}
                    onChange={(e) => setFormData({
                      ...formData,
                      total_cholesterol: { ...formData.total_cholesterol, value: e.target.value },
                    })}
                    helperText="mg/dL"
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Min"
                    value={formData.total_cholesterol.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      total_cholesterol: { ...formData.total_cholesterol, min: parseInt(e.target.value) },
                    })}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Max"
                    value={formData.total_cholesterol.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      total_cholesterol: { ...formData.total_cholesterol, max: parseInt(e.target.value) },
                    })}
                  />
                </Grid>

                {/* LDL */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="LDL"
                    value={formData.ldl.value}
                    onChange={(e) => setFormData({
                      ...formData,
                      ldl: { ...formData.ldl, value: e.target.value },
                    })}
                    helperText="mg/dL"
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Min"
                    value={formData.ldl.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      ldl: { ...formData.ldl, min: parseInt(e.target.value) },
                    })}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Max"
                    value={formData.ldl.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      ldl: { ...formData.ldl, max: parseInt(e.target.value) },
                    })}
                  />
                </Grid>

                {/* HDL */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="HDL"
                    value={formData.hdl.value}
                    onChange={(e) => setFormData({
                      ...formData,
                      hdl: { ...formData.hdl, value: e.target.value },
                    })}
                    helperText="mg/dL"
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Min"
                    value={formData.hdl.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      hdl: { ...formData.hdl, min: parseInt(e.target.value) },
                    })}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Max"
                    value={formData.hdl.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      hdl: { ...formData.hdl, max: parseInt(e.target.value) },
                    })}
                  />
                </Grid>

                {/* Triglycerides */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Triglycerides"
                    value={formData.triglycerides.value}
                    onChange={(e) => setFormData({
                      ...formData,
                      triglycerides: { ...formData.triglycerides, value: e.target.value },
                    })}
                    helperText="mg/dL"
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Min"
                    value={formData.triglycerides.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      triglycerides: { ...formData.triglycerides, min: parseInt(e.target.value) },
                    })}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="Max"
                    value={formData.triglycerides.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      triglycerides: { ...formData.triglycerides, max: parseInt(e.target.value) },
                    })}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes or observations..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      component={Link}
                      href="/lab-results"
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
                      {saving ? 'Saving...' : 'Save Lab Result'}
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
