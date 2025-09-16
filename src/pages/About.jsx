import React from "react";
import { Box, Button, Container, Grid, Typography, Stack } from "@mui/material";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DownloadIcon from "@mui/icons-material/Download";

const About = () => {
  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, rgba(124, 136, 135, 0.9) 0%, rgba(42, 157, 143, 0.85) 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
          minHeight: "100vh",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0.4,
            backgroundImage:
              "url(https://trustedcarbon.org/wp-content/uploads/2025/01/Untitled-design-41-1.webp)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 0,
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(180deg, rgba(14, 118, 110, 0.7) 0%, rgba(42, 157, 143, 0.5) 100%)",
              zIndex: 1,
            },
          }}
        />

        {/* Navbar */}
        <Box sx={{ position: "relative", zIndex: 2 }}>
          <Navbar />
        </Box>

        <Container
          maxWidth="lg"
          sx={{ position: "relative", zIndex: 2, pt: 12, pb: 12 }}
        >
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "2.5rem", md: "4rem" },
                fontWeight: 800,
                mb: 2,
              }}
            >
              About Us
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 6, maxWidth: "800px", mx: "auto" }}
            >
              Blue Carbon is a nature-based carbon registry that creates,
              validates, and manages high-quality carbon credits. Using
              blockchain technology, Trusted Carbon ensures transparency,
              traceability, and integrity in carbon credit transactions.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
            >
              <Button
                variant="outlined"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  borderColor: "white",
                  color: "white",
                  "&:hover": {
                    borderColor: "white",
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
                  px: 4,
                  py: 1.5,
                }}
              >
                Explore Registry
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Section 1: Ensuring Trusted Transparency */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: "#ffffff" }}>
        <Container maxWidth="lg">
          <Grid
            container
            spacing={6}
            alignItems="center"
            justifyContent="center"
          >
            <Grid item xs={12} md={5}>
              <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "20px", md: "24px" },
                    color: "#000000",
                    mb: 3,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    lineHeight: 1.3,
                  }}
                >
                  ENSURING TRUSTED TRANSPARENCY
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "16px", md: "18px" },
                    color: "#666666",
                    lineHeight: 1.7,
                    maxWidth: { xs: "100%", md: "450px" },
                    mx: { xs: "auto", md: "0" },
                  }}
                >
                  Our blockchain-based registry provides complete transparency
                  and traceability for every carbon credit. From project
                  validation to credit retirement, every step is recorded on an
                  immutable ledger, ensuring trust and accountability in the
                  carbon market. We maintain rigorous standards to verify the
                  authenticity and environmental impact of each project.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Box
                  component="img"
                  src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                  alt="Forest transparency"
                  sx={{
                    width: { xs: "100%", md: "380px" },
                    height: { xs: "250px", md: "220px" },
                    objectFit: "cover",
                    borderRadius: "12px",
                    maxWidth: "380px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Section 2: Nature-Based Carbon Projects */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: "#e8f5e8" }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} justifyContent="center">
            <Grid item xs={12} md={5}>
              <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
                <Typography
                  sx={{
                    fontSize: { xs: "16px", md: "18px" },
                    color: "#666666",
                    lineHeight: 1.6,
                    mb: 4,
                    maxWidth: { xs: "100%", md: "400px" },
                    mx: { xs: "auto", md: "0" },
                  }}
                >
                  We specialize in high-quality nature-based solutions that
                  deliver measurable climate impact while supporting
                  biodiversity and local communities.
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "20px", md: "24px" },
                    color: "#000000",
                    lineHeight: 1.4,
                    maxWidth: { xs: "100%", md: "350px" },
                    mx: { xs: "auto", md: "0" },
                  }}
                >
                  Nature-Based Carbon Projects For A Trusted Registry
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ pl: { xs: 0, md: 3 } }}>
                {[
                  "Forest Conservation & Restoration",
                  "Afforestation & Reforestation (A/R)",
                  "Sustainable Agriculture",
                  "Wetland Restoration",
                  "Mangrove Conservation",
                  "Renewable Energy Projects",
                ].map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 2,
                      justifyContent: { xs: "center", md: "flex-start" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#4caf50",
                        mr: 2,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: { xs: "15px", md: "16px" },
                        color: "#333333",
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Section 3: Trusted Carbon General Rules */}
      <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: "#ffffff" }}>
        <Container maxWidth="lg">
          <Grid
            container
            spacing={10}
            alignItems="center"
            justifyContent="center"
          >
            <Grid item xs={12} md={5}>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Box
                  component="img"
                  src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                  alt="Forest rules"
                  sx={{
                    width: { xs: "100%", md: "380px" },
                    height: { xs: "250px", md: "220px" },
                    objectFit: "cover",
                    borderRadius: "12px",
                    maxWidth: "380px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "20px", md: "24px" },
                    color: "#000000",
                    mb: 3,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    lineHeight: 1.3,
                  }}
                >
                  BLUE CARBON GENERAL RULES 2025
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "16px", md: "18px" },
                    color: "#666666",
                    lineHeight: 1.7,
                    mb: 4,
                    maxWidth: { xs: "100%", md: "450px" },
                    mx: { xs: "auto", md: "0" },
                  }}
                >
                  Our comprehensive rulebook outlines the standards,
                  methodologies, and procedures that govern carbon credit
                  generation, validation, and trading within our registry. These
                  rules ensure consistency, transparency, and environmental
                  integrity across all projects.
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: { xs: "center", md: "flex-start" },
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      backgroundColor: "#4caf50",
                      color: "white",
                      px: 3,
                      py: 1.2,
                      fontSize: { xs: "14px", md: "16px" },
                      textTransform: "none",
                      borderRadius: "8px",
                      fontWeight: 600,
                      boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
                      "&:hover": {
                        backgroundColor: "#45a049",
                        boxShadow: "0 6px 16px rgba(76, 175, 80, 0.4)",
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    Download Rules
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default About;
