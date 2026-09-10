import { Show } from 'solid-js';
import { currentRoute } from './utils/router';
import { CountdownView } from './views/CountdownView';
import { CreatorLandingView } from './views/CreatorLandingView';

export function App() {
  return (
    <Show
      when={currentRoute().path === 'countdown'}
      fallback={<CreatorLandingView />}
    >
      <CountdownView config={currentRoute().config} />
    </Show>
  );
}

export default App;
