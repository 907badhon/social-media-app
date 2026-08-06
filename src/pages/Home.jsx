import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Home() {
  const { user } = useContext(AuthContext);
  return <h2>Welcome {user?.displayName}</h2>;
}

export default Home;
