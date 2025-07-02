import React, { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

const Auth_Layout = () => {
  const [toggle, setToggle] = useState<boolean>(false);
  return (
    <main className="min-h-screen overscroll-y-auto flex items-start">
      <Sidebar toggle={toggle} setToggle={setToggle} />
      <section
        className={`w-full md:w-[calc(100%_-_230px)] lg:w-[calc(100%_-_250px)] ms-auto`}
      >
        <Navbar setToggle={setToggle} />
        <section className="px-4 sm:px-6 md:px-8 py-5 sm:py-8">
          <Outlet />
        </section>
      </section>
    </main>
  );
};

export default Auth_Layout;
