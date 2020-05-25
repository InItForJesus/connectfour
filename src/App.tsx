import React from 'react';
import { Switch, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <div>
      <Switch>
        <Route path="/game" component={GamePage} />}
        <Route path="/" component={LandingPage} />
      </Switch>
    </div>
  );
}
