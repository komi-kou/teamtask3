import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TeamHub application', () => {
  render(<App />);
  const linkElement = screen.getByText(/TeamHub/i);
  expect(linkElement).toBeInTheDocument();
});
