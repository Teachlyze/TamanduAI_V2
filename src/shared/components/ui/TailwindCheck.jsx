import React from 'react';

// This component is used to verify Tailwind CSS is working
function TailwindCheck() {
  return (
    <div className="hidden">
      <div className="hidden sm:block"></div>
      <div className="hidden md:block"></div>
      <div className="hidden lg:block"></div>
      <div className="hidden xl:block"></div>
      <div className="hidden 2xl:block"></div>
      <div className="hidden dark:block"></div>
    </div>
  );
}

export default TailwindCheck;
