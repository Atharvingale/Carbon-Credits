import React from 'react';
import { 
  Box, Button, Container, Grid, Typography, Stack, Divider, Card, CardMedia, CardContent, Chip, Avatar
} from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const Blog = () => {
  const mainArticle = {
    category: "Climate Science",
    title: "The Future of Blue Carbon: How Ocean Ecosystems Are Leading Climate Action",
    subtitle: "Discover how mangroves, seagrass beds, and salt marshes are becoming powerful tools in the fight against climate change.",
    author: "Dr. Sarah Ocean",
    date: "2024-03-15",
    readTime: "5 min read",
    image: "https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp"
  };

  const relatedArticles = [
    {
      category: "Case Study",
      title: "Community-Led Conservation: Success Stories from Costa Rica",
      subtitle: "Learn how local communities are driving blue carbon projects that benefit both the environment and local economies.",
      author: "Elena Costal",
      date: "2024-03-10",
      readTime: "7 min read",
      image: "https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp"
    },
    {
      category: "Technology",
      title: "Understanding Carbon Credit Verification: What Buyers Need to Know",
      subtitle: "A comprehensive guide to carbon credit standards, verification processes, and how to ensure your purchases make a real impact.",
      author: "Marcus Rivera",
      date: "2024-03-05",
      readTime: "6 min read",
      image: "https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp"
    },
    {
      category: "Research",
      title: "Seagrass Restoration: The Hidden Carbon Champions of Our Oceans",
      subtitle: "Explore the incredible carbon sequestration potential of seagrass ecosystems and ongoing restoration efforts worldwide.",
      author: "Dr. James Current",
      date: "2024-02-28",
      readTime: "4 min read",
      image: "https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp"
    }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      "Climate Science": "#2a9d8f",
      "Case Study": "#264653",
      "Technology": "#287271",
      "Research": "#0e766e"
    };
    return colors[category] || "#6c757d";
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, rgba(124, 136, 135, 0.9) 0%, rgba(42, 157, 143, 0.85) 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            opacity: 0.4,
            backgroundImage: 'url(https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(14, 118, 110, 0.7) 0%, rgba(42, 157, 143, 0.5) 100%)',
              zIndex: 1
            }
          }} 
        />
        
        {/* Navbar */}
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Navbar />
        </Box>
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: 12, pb: 12 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, fontWeight: 800, mb: 2 }}>
              Blogs And Newsletters
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, maxWidth: '800px', mx: 'auto' }}>
                Stay updated with the latest news, insights, and announcements from our community. Subscribe to our newsletter to receive regular updates on our carbon removal initiatives, industry trends, and best practices.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Articles Section */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          {/* Section Header */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: { xs: 6, md: 8 },
            px: { xs: 2, md: 0 }
          }}>
            <Typography variant="h2" sx={{ 
              fontSize: { xs: '2rem', md: '2.5rem' }, 
              fontWeight: 700, 
              mb: 3, 
              color: '#264653',
              lineHeight: 1.3
            }}>
              Featured Article
            </Typography>
            <Typography variant="h6" sx={{ 
              color: '#6c757d', 
              maxWidth: '500px', 
              mx: 'auto',
              lineHeight: 1.6,
              fontSize: { xs: '1rem', md: '1.1rem' }
            }}>
              Discover the most impactful stories shaping the future of carbon markets
            </Typography>
          </Box>

          {/* Featured Article */}
          <Box sx={{ mb: { xs: 8, md: 12 } }}>
            <Card sx={{
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: 'white',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.12)'
              }
            }}>
              <Grid container sx={{ minHeight: { md: 500 } }}>
                <Grid item xs={12} md={6}>
                  <CardMedia
                    component="div"
                    sx={{
                      height: { xs: 300, md: '100%' },
                      minHeight: { md: 500 },
                      position: 'relative',
                      background: 'linear-gradient(135deg, rgba(14, 118, 110, 0.8) 0%, rgba(42, 157, 143, 0.7) 100%)',
                      backgroundImage: `url(${mainArticle.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundBlendMode: 'overlay'
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: 24, left: 24 }}>
                      <Chip 
                        label={mainArticle.category}
                        sx={{ 
                          backgroundColor: getCategoryColor(mainArticle.category),
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          px: 2,
                          py: 1
                        }}
                      />
                    </Box>
                  </CardMedia>
                </Grid>
                <Grid item xs={12} md={6}>
                  <CardContent sx={{ 
                    p: { xs: 4, md: 6 }, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h3" sx={{ 
                      fontSize: { xs: '1.75rem', md: '2.25rem' }, 
                      fontWeight: 700, 
                      mb: 3, 
                      color: '#264653',
                      lineHeight: 1.3 
                    }}>
                      {mainArticle.title}
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      mb: 4, 
                      color: '#6c757d', 
                      lineHeight: 1.7,
                      fontSize: { xs: '1rem', md: '1.1rem' }
                    }}>
                      {mainArticle.subtitle}
                    </Typography>
                    
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={{ xs: 2, sm: 3 }} 
                      sx={{ 
                        mb: 4, 
                        alignItems: { xs: 'flex-start', sm: 'center' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6c757d' }}>
                        <PersonIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{mainArticle.author}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6c757d' }}>
                        <CalendarTodayIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body2">{mainArticle.date}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6c757d' }}>
                        <AccessTimeIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body2">{mainArticle.readTime}</Typography>
                      </Box>
                    </Stack>
                    
                    <Button 
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        backgroundColor: '#2a9d8f',
                        borderRadius: 3,
                        px: 4,
                        py: 2,
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        alignSelf: 'flex-start',
                        boxShadow: '0 4px 16px rgba(42, 157, 143, 0.3)',
                        '&:hover': {
                          backgroundColor: '#238276',
                          boxShadow: '0 6px 20px rgba(42, 157, 143, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      Read Full Article
                    </Button>
                  </CardContent>
                </Grid>
              </Grid>
            </Card>
          </Box>

          {/* Section Divider */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: { xs: 6, md: 8 },
            px: { xs: 2, md: 0 }
          }}>
            <Typography variant="h4" sx={{ 
              fontSize: { xs: '1.75rem', md: '2.25rem' }, 
              fontWeight: 700, 
              mb: 3, 
              color: '#264653',
              lineHeight: 1.3
            }}>
              More Articles
            </Typography>
            <Divider sx={{ 
              width: 80, 
              height: 4, 
              backgroundColor: '#2a9d8f', 
              mx: 'auto', 
              borderRadius: 2,
              mb: 2
            }} />
            <Typography variant="body1" sx={{ 
              color: '#6c757d', 
              maxWidth: '400px', 
              mx: 'auto',
              lineHeight: 1.6
            }}>
              Explore our collection of insights and analysis
            </Typography>
          </Box>

          {/* Related Articles Grid */}
          <Grid container spacing={{ xs: 3, md: 4 }} sx={{ alignItems: 'stretch' }}>
            {relatedArticles.map((article, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  sx={{ 
                    height: '100%',
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <CardMedia
                    component="div"
                    sx={{
                      height: 240,
                      position: 'relative',
                      background: 'linear-gradient(135deg, rgba(14, 118, 110, 0.8) 0%, rgba(42, 157, 143, 0.7) 100%)',
                      backgroundImage: `url(${article.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundBlendMode: 'overlay'
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
                      <Chip 
                        label={article.category}
                        size="small"
                        sx={{ 
                          backgroundColor: getCategoryColor(article.category),
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                  </CardMedia>
                  
                  <CardContent sx={{ 
                    p: { xs: 3, md: 3.5 }, 
                    flex: 1,
                    display: 'flex', 
                    flexDirection: 'column'
                  }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      mb: 2, 
                      color: '#264653', 
                      lineHeight: 1.4,
                      fontSize: { xs: '1.1rem', md: '1.2rem' }
                    }}>
                      {article.title}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      mb: 3, 
                      color: '#6c757d', 
                      lineHeight: 1.6, 
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {article.subtitle}
                    </Typography>
                    
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={{ xs: 1, sm: 2 }} 
                      sx={{ 
                        mb: 3,
                        alignItems: { xs: 'flex-start', sm: 'center' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6c757d' }}>
                        <PersonIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>{article.author}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6c757d' }}>
                        <CalendarTodayIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption">{article.date}</Typography>
                      </Box>
                    </Stack>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mt: 'auto'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6c757d' }}>
                        <AccessTimeIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption">{article.readTime}</Typography>
                      </Box>
                      <Button 
                        size="small" 
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                        sx={{ 
                          color: '#2a9d8f', 
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          '&:hover': { 
                            backgroundColor: 'rgba(42, 157, 143, 0.04)',
                            transform: 'translateX(2px)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        Read More
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Blog;