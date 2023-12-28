import { useSelector } from "react-redux"
import { Outlet } from "react-router-dom"
import {  FiChevronsRight } from "react-icons/fi";

import Sidebar from "../components/core/Dashboard/Sidebar"
import { useState } from "react";

function Dashboard() {
  const { loading: profileLoading } = useSelector((state) => state.profile)
  const { loading: authLoading } = useSelector((state) => state.auth)
  const[hideMenu, setHideMenu] = useState(false);

  if (profileLoading || authLoading) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }

  const toggle = ()=>{
    setHideMenu(!hideMenu);
  }


  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)]">
      <div className="absolute left-[1rem] top-[0.1rem] text-richblack-5 text-2xl">
        <button onClick={toggle}><FiChevronsRight /></button>
      </div>
      { hideMenu &&
        <Sidebar toggle={toggle} />
      }
      <div className=" h-[calc(100vh-3.5rem)] flex-1 overflow-auto">
        <div className="mx-auto w-11/12 max-w-[1000px] py-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
