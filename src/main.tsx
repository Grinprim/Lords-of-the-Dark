import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/app.css';
import './styles/print.css';
import { App } from './App';
import { initStore, flushSaves } from './store/store';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
  void initStore();
  // Write any pending change when the page is hidden or closed.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSaves();
  });
  window.addEventListener('pagehide', () => void flushSaves());
}
