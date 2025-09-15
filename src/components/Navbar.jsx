import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { supabase } from "../lib/supabaseClient";

const Navbar = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      handleUserMenuClose();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDashboard = () => {
    handleUserMenuClose();
    navigate("/dashboard");
  };

  const navigationLinks = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Registry", path: "/registry" },
    { name: "New Registry", path: "/new-registry" },
    { name: "Blog & Newsletter", path: "/blog" },
  ];

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "transparent",
          boxShadow: "none", // removes shadow
          borderBottom: "none", // removes bottom line
          backdropFilter: "none", // removes blur effect
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              minHeight: { xs: "64px", sm: "70px" },
              justifyContent: "space-between",
            }}
          >
            {/* Logo Section */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="h5"
                component={Link}
                to="/"
                sx={{
                  fontWeight: 800,
                  color: "#ffffff",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    color: "#4CAF50",
                  },
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ marginRight: "8px" }}
                >
                  <circle cx="16" cy="16" r="14" fill="#4CAF50" opacity="0.1" />
                  <path
                    d="M12 16c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z"
                    fill="#4CAF50"
                  />
                  <path
                    d="M10 12l6 6M22 12l-6 6"
                    stroke="#4CAF50"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <Box
                  component="span"
                  sx={{ fontSize: { xs: "1.3rem", sm: "1.5rem" } }}
                >
                  Blue
                  <Box component="span" sx={{ color: "#4CAF50" }}>
                    Carbon
                  </Box>
                </Box>
              </Typography>
            </Box>

            {/* Desktop Navigation */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  display: { xs: "none", lg: "flex" },
                  alignItems: "center",
                  gap: 1,
                }}
              >
                {navigationLinks.map((link) => (
                  <Button
                    key={link.name}
                    component={Link}
                    to={link.path}
                    sx={{
                      color: "rgba(255, 255, 255, 0.9)",
                      px: 2,
                      py: 1,
                      borderRadius: "8px",
                      textTransform: "none",
                      fontSize: "0.95rem",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        color: "#4CAF50",
                        backgroundColor: "rgba(76, 175, 80, 0.1)",
                      },
                    }}
                  >
                    {link.name}
                  </Button>
                ))}
              </Box>

              {/* Desktop Auth Section */}
              <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 1, ml: 2 }}>
                {user ? (
                  // Authenticated user menu
                  <>
                    <Button
                      onClick={handleUserMenuOpen}
                      startIcon={<AccountCircleIcon />}
                      sx={{
                        color: "#ffffff",
                        textTransform: "none",
                        borderRadius: "25px",
                        px: 3,
                        "&:hover": {
                          backgroundColor: "rgba(76, 175, 80, 0.1)",
                        },
                      }}
                    >
                      {user.email?.split("@")[0] || "User"}
                    </Button>
                    <Menu
                      anchorEl={userMenuAnchor}
                      open={Boolean(userMenuAnchor)}
                      onClose={handleUserMenuClose}
                      transformOrigin={{ horizontal: "right", vertical: "top" }}
                      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    >
                      <MenuItem onClick={handleDashboard}>
                        <DashboardIcon sx={{ mr: 1 }} />
                        Dashboard
                      </MenuItem>
                      <Divider />
                      <MenuItem onClick={handleLogout}>
                        <LogoutIcon sx={{ mr: 1 }} />
                        Logout
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  // Non-authenticated user buttons
                  <>
                    <Button
                      component={Link}
                      to="/login"
                      variant="outlined"
                      sx={{
                        color: "#ffffff",
                        borderColor: "rgba(255, 255, 255, 0.3)",
                        textTransform: "none",
                        borderRadius: "25px",
                        px: 3,
                        "&:hover": {
                          borderColor: "#4CAF50",
                          color: "#4CAF50",
                          backgroundColor: "rgba(76, 175, 80, 0.1)",
                        },
                      }}
                    >
                      Login
                    </Button>
                    <Button
                      component={Link}
                      to="/signup"
                      variant="contained"
                      sx={{
                        bgcolor: "#4CAF50",
                        textTransform: "none",
                        borderRadius: "25px",
                        px: 3,
                        "&:hover": {
                          bgcolor: "#388E3C",
                        },
                      }}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </Box>

              {/* Mobile Menu Button */}
              <IconButton
                onClick={handleDrawerToggle}
                sx={{
                  display: { lg: "none" },
                  color: "#ffffff",
                  "&:hover": {
                    color: "#4CAF50",
                    backgroundColor: "rgba(76, 175, 80, 0.1)",
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Menu */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
            color: "#ffffff",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#4CAF50" }}>
            BlueCarbon
          </Typography>
          <IconButton onClick={handleDrawerToggle} sx={{ color: "#ffffff" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List sx={{ pt: 0 }}>
          {navigationLinks.map((link) => (
            <ListItem
              key={link.name}
              component={Link}
              to={link.path}
              onClick={handleDrawerToggle}
              sx={{
                color: "rgba(255, 255, 255, 0.9)",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "rgba(76, 175, 80, 0.1)",
                  color: "#4CAF50",
                },
              }}
            >
              <ListItemText primary={link.name} />
            </ListItem>
          ))}

          {/* Mobile Auth Section */}
          <Box sx={{ mt: 2, px: 2 }}>
            {user ? (
              // Authenticated user mobile menu
              <>
                <ListItem
                  sx={{
                    px: 0,
                    mb: 1,
                    borderRadius: 1,
                    backgroundColor: "rgba(76, 175, 80, 0.1)",
                  }}
                >
                  <AccountCircleIcon sx={{ mr: 1, color: "#4CAF50" }} />
                  <ListItemText
                    primary={user.email?.split("@")[0] || "User"}
                    secondary={user.email}
                    sx={{
                      "& .MuiListItemText-primary": {
                        color: "#4CAF50",
                        fontWeight: 600,
                      },
                      "& .MuiListItemText-secondary": {
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "0.8rem",
                      },
                    }}
                  />
                </ListItem>
                <Button
                  onClick={() => {
                    handleDashboard();
                    handleDrawerToggle();
                  }}
                  startIcon={<DashboardIcon />}
                  fullWidth
                  variant="outlined"
                  sx={{
                    color: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    textTransform: "none",
                    mb: 1,
                    justifyContent: "flex-start",
                    "&:hover": {
                      borderColor: "#4CAF50",
                      color: "#4CAF50",
                    },
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  onClick={() => {
                    handleLogout();
                    handleDrawerToggle();
                  }}
                  startIcon={<LogoutIcon />}
                  fullWidth
                  variant="contained"
                  sx={{
                    bgcolor: "rgba(244, 67, 54, 0.8)",
                    textTransform: "none",
                    justifyContent: "flex-start",
                    "&:hover": {
                      bgcolor: "rgba(244, 67, 54, 1)",
                    },
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              // Non-authenticated mobile menu
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Button
                  component={Link}
                  to="/login"
                  onClick={handleDrawerToggle}
                  variant="outlined"
                  sx={{
                    color: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#4CAF50",
                      color: "#4CAF50",
                    },
                  }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/signup"
                  onClick={handleDrawerToggle}
                  variant="contained"
                  sx={{
                    bgcolor: "#4CAF50",
                    textTransform: "none",
                    "&:hover": {
                      bgcolor: "#388E3C",
                    },
                  }}
                >
                  Sign Up
                </Button>
              </Box>
            )}
          </Box>
        </List>
      </Drawer>
    </>
  );
};

export default Navbar;
