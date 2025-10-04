import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate login process
    try {
      // In a real app, you would make an API call here
      console.log('Login attempt with:', { email, password });
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Login successful! (This is a simulation)');
    } catch (err) {
      setError('Failed to log in. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow">
            <Card.Body>
              <h2 className="text-center mb-4">Login to FinanceApp</h2>
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button 
                  className="w-100 mb-3" 
                  type="submit" 
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </Form>

              <div className="text-center">
                <Link to="/signup">Don't have an account? Sign up</Link>
              </div>
              <div className="text-center mt-2">
                <Link to="#">Forgot password?</Link>
              </div>

              <div className="divider mt-4 mb-3">
                <hr />
                <div className="text-center text-muted small">or</div>
              </div>

              <div className="d-grid gap-2">
                <Button variant="outline-secondary" className="mb-2">
                  Login with Google
                </Button>
                <Button variant="outline-dark">
                  Login with Apple
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;